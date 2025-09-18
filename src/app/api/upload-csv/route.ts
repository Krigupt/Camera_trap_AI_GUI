import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const csvFile = formData.get('csvFile') as File;

    if (!csvFile) {
      return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 });
    }

    // Read the uploaded CSV file
    const csvBuffer = await csvFile.arrayBuffer();
    const csvContent = Buffer.from(csvBuffer).toString('utf-8');

    // Define the target path where the CSV should be saved
    const targetPath = '/Users/krishnagupta/Desktop/internship/filtered_output_B1.csv';

    // Create backup of existing file if it exists
    if (fs.existsSync(targetPath)) {
      const backupPath = `/Users/krishnagupta/Desktop/internship/filtered_output_B1_backup_${Date.now()}.csv`;
      fs.copyFileSync(targetPath, backupPath);
    }

    // Write the new CSV content to the target location
    fs.writeFileSync(targetPath, csvContent);
    
    // Parse the CSV to get some basic info
    const lines = csvContent.split('\n');
    const headers = lines[0] ? lines[0].split(',') : [];
    const rowCount = lines.length - 1; // Exclude header

    return NextResponse.json({
      success: true,
      message: 'CSV file uploaded successfully',
      filename: csvFile.name,
      savedPath: targetPath,
      headers: headers.map(h => h.trim()),
      rowCount
    });

  } catch (error) {
    console.error('Error uploading CSV file:', error);
    return NextResponse.json({ 
      error: 'Failed to upload CSV file' 
    }, { status: 500 });
  }
}
