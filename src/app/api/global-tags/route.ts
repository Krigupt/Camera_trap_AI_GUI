import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const { filename, imagePath, tags } = await request.json();
    console.log(`Updating global tags - Filename: ${filename}, Image: ${imagePath}, Tags:`, tags);

    if (!filename || !imagePath) {
      return NextResponse.json({ error: 'Filename and imagePath are required' }, { status: 400 });
    }

    // Find all sheets for this filename and update global tags
    const allSheets = await ExcelData.find({ filename });
    
    if (!allSheets || allSheets.length === 0) {
      return NextResponse.json({ error: 'No data found for this filename' }, { status: 404 });
    }

    console.log(`Found ${allSheets.length} sheets to update`);

    // Update global tags for all sheets of this file
    for (const sheet of allSheets) {
      if (!sheet.globalImageTags) {
        sheet.globalImageTags = {};
      }
      
      sheet.globalImageTags[imagePath] = tags;
      sheet.markModified('globalImageTags'); // Force Mongoose to detect changes
      await sheet.save();
      console.log(`Updated global tags for sheet: ${sheet.sheetName}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating global tags:', error);
    return NextResponse.json({ error: 'Failed to update global tags' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Get global tags from any sheet (they should be the same across all sheets)
    const sheet = await ExcelData.findOne({ filename });
    
    if (!sheet) {
      return NextResponse.json({ error: 'No data found for this filename' }, { status: 404 });
    }

    return NextResponse.json({ globalImageTags: sheet.globalImageTags || {} });
  } catch (error) {
    console.error('Error fetching global tags:', error);
    return NextResponse.json({ error: 'Failed to fetch global tags' }, { status: 500 });
  }
}
