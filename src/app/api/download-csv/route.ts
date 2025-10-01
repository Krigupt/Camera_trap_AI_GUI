import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CsvData from '@/models/CsvData';

export async function GET() {
  try {
    await connectDB();

    // Get all CSV data from MongoDB
    const csvData = await CsvData.find({}).sort({ uploadedAt: -1 });
    
    if (csvData.length === 0) {
      return NextResponse.json({ 
        error: 'No CSV data found. Please upload a CSV file first.' 
      }, { status: 404 });
    }

    // Generate CSV content
    const headers = ['deployment_id', 'filename', 'class', 'order', 'family', 'genus', 'species', 'common_name'];
    const csvLines = [headers.join(',')];
    
    csvData.forEach(record => {
      const row = [
        record.deployment_id,
        record.filename,
        record.class,
        record.order,
        record.family,
        record.genus,
        record.species,
        record.common_name
      ];
      csvLines.push(row.join(','));
    });

    const csvContent = csvLines.join('\n');
    
    // Create a response with the CSV content
    const response = new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="updated_species_data.csv"',
      },
    });

    return response;
    
  } catch (error) {
    console.error('Error downloading CSV file:', error);
    return NextResponse.json({ 
      error: 'Failed to download CSV file' 
    }, { status: 500 });
  }
}
