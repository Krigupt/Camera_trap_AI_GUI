import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CsvData from '@/models/CsvData';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const formData = await request.formData();
    const csvFile = formData.get('csvFile') as File;

    if (!csvFile) {
      return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 });
    }

    // Read the uploaded CSV file
    const csvBuffer = await csvFile.arrayBuffer();
    const csvContent = Buffer.from(csvBuffer).toString('utf-8');

    // Parse CSV content
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0] ? lines[0].split(',').map(h => h.trim()) : [];
    
    // Validate required columns
    const requiredColumns = ['deployment_id', 'filename', 'class', 'order', 'family', 'genus', 'species', 'common_name'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      return NextResponse.json({ 
        error: `Missing required columns: ${missingColumns.join(', ')}` 
      }, { status: 400 });
    }

    // Clear existing CSV data
    await CsvData.deleteMany({});

    // Parse and save CSV data to MongoDB
    const csvDataArray = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= headers.length) {
        const csvRecord = {
          deployment_id: values[headers.indexOf('deployment_id')] || '',
          filename: values[headers.indexOf('filename')] || '',
          class: values[headers.indexOf('class')] || '',
          order: values[headers.indexOf('order')] || '',
          family: values[headers.indexOf('family')] || '',
          genus: values[headers.indexOf('genus')] || '',
          species: values[headers.indexOf('species')] || '',
          common_name: values[headers.indexOf('common_name')] || '',
        };
        csvDataArray.push(csvRecord);
      }
    }

    // Save all records to MongoDB
    await CsvData.insertMany(csvDataArray);

    return NextResponse.json({
      success: true,
      message: 'CSV file uploaded and parsed successfully',
      filename: csvFile.name,
      headers: headers,
      rowCount: csvDataArray.length,
      recordsSaved: csvDataArray.length
    });

  } catch (error) {
    console.error('Error uploading CSV file:', error);
    return NextResponse.json({ 
      error: 'Failed to upload CSV file' 
    }, { status: 500 });
  }
}
