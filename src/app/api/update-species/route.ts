import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';
import CsvData from '@/models/CsvData';
import path from 'path';

export const maxDuration = 30;

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      excelSheetId,
      filename,
      sheetName,
      imagePath,
      species,
    } = body as {
      excelSheetId?: string;
      filename?: string;
      sheetName?: string;
      imagePath?: string;
      species?: unknown;
    };

    if (!excelSheetId || !filename || !sheetName || !imagePath || species === undefined) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: excelSheetId, filename, sheetName, imagePath, species',
        },
        { status: 400 }
      );
    }

    const isClearing = species === '' || species === 'CLEAR_SELECTION';
    const cleanSpecies = isClearing
      ? ''
      : String(species).replace(/‚Äî/g, '-').replace(/—/g, '-');

    const excelDataDoc = await ExcelData.findById(excelSheetId);
    if (
      !excelDataDoc ||
      excelDataDoc.filename !== filename ||
      excelDataDoc.sheetName !== sheetName
    ) {
      return NextResponse.json({ error: 'Excel data not found' }, { status: 404 });
    }

    const imageFilename = path.basename(imagePath);

    try {
      const uploadGroupId = excelDataDoc.uploadGroupId;
      const csvQuery = uploadGroupId
        ? { filename: imageFilename, uploadGroupId }
        : { filename: imageFilename };

      const csvRecord = await CsvData.findOne(csvQuery);

      if (csvRecord) {
        const taxonomicLevels = {
          class: 'class',
          order: 'order',
          family: 'family',
          genus: 'genus',
          species: 'species',
          common_name: 'common_name',
        };

        const currentLevel = Object.keys(taxonomicLevels).find((level) =>
          sheetName.toLowerCase().includes(level.toLowerCase())
        );

        if (currentLevel && taxonomicLevels[currentLevel as keyof typeof taxonomicLevels]) {
          const fieldToUpdate = taxonomicLevels[currentLevel as keyof typeof taxonomicLevels];

          if (isClearing) {
            (csvRecord as Record<string, unknown>)[fieldToUpdate] = '';
          } else {
            (csvRecord as Record<string, unknown>)[fieldToUpdate] = cleanSpecies;
          }

          await csvRecord.save();
        }
      }
    } catch (csvError) {
      console.error('Error updating CSV data in MongoDB:', csvError);
    }

    return NextResponse.json({
      success: true,
      message: 'Species classification updated successfully',
      updatedImage: imageFilename,
      species: cleanSpecies,
    });
  } catch (error) {
    console.error('Error updating species classification:', error);
    return NextResponse.json(
      { error: 'Failed to update species classification' },
      { status: 500 }
    );
  }
}
