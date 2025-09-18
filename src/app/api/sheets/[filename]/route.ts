import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    await connectDB();

    const resolvedParams = await params;
    // Decode the filename in case it's URL encoded
    const decodedFilename = decodeURIComponent(resolvedParams.filename);

    const sheets = await ExcelData.find(
      { filename: decodedFilename },
      { _id: 1, sheetName: 1 }
    );

    const sheetsData = sheets.map(sheet => ({
      id: sheet._id.toString(),
      sheetName: sheet.sheetName
    }));

    // Remove duplicates based on sheetName
    const uniqueSheets = sheetsData.filter((sheet, index, self) => 
      index === self.findIndex(s => s.sheetName === sheet.sheetName)
    );


    return NextResponse.json(uniqueSheets);
  } catch (error) {
    console.error('Error fetching sheets:', error);
    return NextResponse.json({ error: 'Failed to fetch sheets' }, { status: 500 });
  }
}
