import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';
import CsvData from '@/models/CsvData';

const INSERT_CHUNK_SIZE = 5000;

async function insertCsvChunks(
  rows: Array<Record<string, string>>,
  uploadGroupId: string
) {
  const withGroup = rows.map((r) => ({ ...r, uploadGroupId }));
  for (let i = 0; i < withGroup.length; i += INSERT_CHUNK_SIZE) {
    const chunk = withGroup.slice(i, i + INSERT_CHUNK_SIZE);
    await CsvData.insertMany(chunk, { ordered: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const formData = await request.formData();
    const csvFile = formData.get('csvFile') as File;
    const uploadGroupId = (formData.get('uploadGroupId') as string)?.trim();

    if (!csvFile) {
      return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 });
    }
    if (!uploadGroupId) {
      return NextResponse.json(
        { error: 'uploadGroupId is required (upload Excel first in the same session).' },
        { status: 400 }
      );
    }

    const anchor = await ExcelData.findOne({ uploadGroupId, clerkUserId: userId });
    if (!anchor) {
      return NextResponse.json(
        { error: 'Invalid or expired upload session for this CSV.' },
        { status: 403 }
      );
    }

    const csvBuffer = await csvFile.arrayBuffer();
    const csvContent = Buffer.from(csvBuffer).toString('utf-8');

    const lines = csvContent.split('\n').filter((line) => line.trim());
    const headers = lines[0] ? lines[0].split(',').map((h) => h.trim()) : [];

    const requiredColumns = [
      'deployment_id',
      'filename',
      'class',
      'order',
      'family',
      'genus',
      'species',
      'common_name',
    ];
    const missingColumns = requiredColumns.filter((col) => !headers.includes(col));

    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingColumns.join(', ')}` },
        { status: 400 }
      );
    }

    await CsvData.deleteMany({ uploadGroupId });

    const csvDataArray: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      if (values.length >= headers.length) {
        csvDataArray.push({
          deployment_id: values[headers.indexOf('deployment_id')] || '',
          filename: values[headers.indexOf('filename')] || '',
          class: values[headers.indexOf('class')] || '',
          order: values[headers.indexOf('order')] || '',
          family: values[headers.indexOf('family')] || '',
          genus: values[headers.indexOf('genus')] || '',
          species: values[headers.indexOf('species')] || '',
          common_name: values[headers.indexOf('common_name')] || '',
        });
      }
    }

    if (csvDataArray.length > 0) {
      await insertCsvChunks(csvDataArray, uploadGroupId);
    }

    return NextResponse.json({
      success: true,
      message: 'CSV file uploaded and parsed successfully',
      filename: csvFile.name,
      headers: headers,
      rowCount: csvDataArray.length,
      recordsSaved: csvDataArray.length,
      uploadGroupId,
    });
  } catch (error) {
    console.error('Error uploading CSV file:', error);
    return NextResponse.json({ error: 'Failed to upload CSV file' }, { status: 500 });
  }
}
