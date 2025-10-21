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

    // Find all sheets for this filename
    const allSheets = await ExcelData.find({ filename });
    
    if (!allSheets || allSheets.length === 0) {
      return NextResponse.json({ error: 'No data found for this filename' }, { status: 404 });
    }

    // Update sheet-specific tags for all sheets of this file
    for (const sheet of allSheets) {
      if (!sheet.sheetSpecificImageTags) {
        sheet.sheetSpecificImageTags = {};
      }
      
      // Initialize the sheetName object if it doesn't exist
      if (!sheet.sheetSpecificImageTags[sheetName]) {
        sheet.sheetSpecificImageTags[sheetName] = {};
      }
      
      // Update tags for this specific image in this specific sheet
      sheet.sheetSpecificImageTags[sheetName][imagePath] = tags;
      sheet.markModified('sheetSpecificImageTags'); // Force Mongoose to detect changes
      await sheet.save();
    }

    return NextResponse.json({ success: true });
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
