import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
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
      const filenamesIndex = headers.findIndex(h => h?.toLowerCase().includes('filenames'));


      if (humanIndex === -1 || aiIndex === -1 || filenamesIndex === -1) {
        continue;
      }

      // Map rows to clean objects
      //here this is the code to split the filenames into image paths
      const data = jsonData.slice(1).map((row: any, index: number) => {
        const rowArray = row as any[];
        
        return {
          human: rowArray[humanIndex] || '',
          ai: rowArray[aiIndex] || '',
          filenames: rowArray[filenamesIndex] || '',
          imagePaths: (rowArray[filenamesIndex] || '')
            .split(',')
            .map((f: string) => f.trim())
            .filter(Boolean),
          tags: [],
          isSelected: false
        };
      });

      // Save sheet data
      const excelData = new ExcelData({
        filename: file.name,
        sheetName,
        data,
      });

      await excelData.save();
      results.push({ id: excelData._id, sheetName });
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'No valid sheets found with Human/AI/Filenames columns' },
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
