import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const { filename, sheetName, imagePath, tags } = await request.json();

    if (!filename || !sheetName || !imagePath) {
      return NextResponse.json({ error: 'Filename, sheetName, and imagePath are required' }, { status: 400 });
    }

    // Use atomic update to prevent race conditions when multiple taggers work on the same batch
    // This ensures that concurrent updates don't overwrite each other
    const updateResult = await ExcelData.updateMany(
      { filename },
      {
        $set: {
          [`sheetSpecificImageTags.${sheetName}.${imagePath}`]: tags
        }
      }
    );
    
    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: 'No data found for this filename' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      documentsUpdated: updateResult.modifiedCount 
    });
  } catch (error) {
    console.error('Error updating sheet-specific tags:', error);
    return NextResponse.json({ error: 'Failed to update sheet-specific tags' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const sheetName = searchParams.get('sheetName');

    if (!filename || !sheetName) {
      return NextResponse.json({ error: 'Filename and sheetName are required' }, { status: 400 });
    }

    // Get sheet-specific tags from any sheet (they should be the same across all sheets)
    const sheet = await ExcelData.findOne({ filename });
    
    if (!sheet) {
      return NextResponse.json({ error: 'No data found for this filename' }, { status: 404 });
    }

    // Get tags for this specific sheet
    const sheetTags = sheet.sheetSpecificImageTags?.[sheetName] || {};

    return NextResponse.json({ sheetImageTags: sheetTags });
  } catch (error) {
    console.error('Error fetching sheet-specific tags:', error);
    return NextResponse.json({ error: 'Failed to fetch sheet-specific tags' }, { status: 500 });
  }
}
