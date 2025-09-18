import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const csvPath = '/Users/krishnagupta/Desktop/internship/filtered_output_B1.csv';
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ 
        error: 'CSV file not found. Please upload a CSV file first.' 
      }, { status: 404 });
    }

    // Read the CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
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
