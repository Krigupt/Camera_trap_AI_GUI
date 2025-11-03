import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucketName = formData.get('bucketName') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!bucketName) {
      return NextResponse.json({ error: 'GCP bucket name is required' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const results = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = jsonData[0] as string[];
      if (!headers) continue;


      // Find required columns
      const humanIndex = headers.findIndex(h => h?.toLowerCase().includes('human'));
      const aiIndex = headers.findIndex(h => h?.toLowerCase().includes('ai'));
      
      // Find all Filenames columns (Filenames, Filenames_1, Filenames_2, etc.)
      const filenamesIndices: number[] = [];
      headers.forEach((header, index) => {
        if (header?.toLowerCase().includes('filenames')) {
          filenamesIndices.push(index);
        }
      });

      if (humanIndex === -1 || aiIndex === -1 || filenamesIndices.length === 0) {
        continue;
      }

      // Map rows to clean objects
      // Combine filenames from all Filenames_X columns into imagePaths
      const data = jsonData.slice(1).map((row: any, index: number) => {
        const rowArray = row as any[];
        
        // Combine all filenames from all Filenames_X columns
        const allFilenames: string[] = [];
        const filenamesStrings: string[] = [];
        
        filenamesIndices.forEach(filenamesIndex => {
          const filenamesValue = rowArray[filenamesIndex] || '';
          if (filenamesValue && typeof filenamesValue === 'string') {
            filenamesStrings.push(filenamesValue);
            // Split by comma and add to combined list
            const splitFilenames = filenamesValue
              .split(',')
              .map((f: string) => f.trim())
              .filter(Boolean);
            allFilenames.push(...splitFilenames);
          }
        });
        
        // Join all filenames strings for backward compatibility (if needed)
        const combinedFilenamesString = filenamesStrings.join(',');
        
        return {
          human: rowArray[humanIndex] || '',
          ai: rowArray[aiIndex] || '',
          filenames: combinedFilenamesString,
          imagePaths: allFilenames, // All filenames from all Filenames_X columns combined
          tags: [],
          isSelected: false
        };
      });

      // Save sheet data
      const excelData = new ExcelData({
        filename: file.name,
        sheetName,
        bucketName,
        data,
      });

      await excelData.save();
      results.push({ id: excelData._id, sheetName });
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'No valid sheets found with Human/AI/Filenames columns (supports Filenames, Filenames_1, Filenames_2, etc.)' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      id: results[0].id, // Return first sheet ID
      sheets: results,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}
