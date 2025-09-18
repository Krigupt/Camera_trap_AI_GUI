import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    // Find the Excel data by ID
    const excelData = await ExcelData.findById(id);
    
    if (!excelData) {
      return NextResponse.json({ 
        error: 'Excel data not found' 
      }, { status: 404 });
    }

    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Convert the stored data back to worksheet format
    const worksheetData = excelData.data.map(row => ({
      Human: row.human,
      AI: row.ai,
      Filenames: row.filenames ? row.filenames.join(', ') : ''
    }));
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    
    // Add the worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, excelData.sheetName);
    
    // Write workbook to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Create response with the Excel file
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="original_${excelData.filename}"`,
      },
    });

    return response;
    
  } catch (error) {
    console.error('Error downloading original data:', error);
    return NextResponse.json({ 
      error: 'Failed to download original data' 
    }, { status: 500 });
  }
}
