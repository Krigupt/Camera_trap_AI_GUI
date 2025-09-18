import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const { filename, imagePath, species } = await request.json();

    if (!filename || !imagePath || !species) {
      return NextResponse.json({ 
        error: 'Missing required fields: filename, imagePath, species' 
      }, { status: 400 });
    }


    // Find all sheets with this filename
    const allSheets = await ExcelData.find({ filename });
    
    if (allSheets.length === 0) {
      return NextResponse.json({ 
        error: 'No sheets found for filename' 
      }, { status: 404 });
    }


    // Update global species for all sheets with this filename
    for (const sheet of allSheets) {
      if (!sheet.globalImageSpecies) {
        sheet.globalImageSpecies = {};
      }
      
      if (species === '' || species === 'CLEAR_SELECTION') {
        // Clear the species classification
        delete sheet.globalImageSpecies[imagePath];
      } else {
        // Clean species string to fix encoding issues and set it
        const cleanSpecies = species.replace(/‚Äî/g, '-').replace(/—/g, '-');
        sheet.globalImageSpecies[imagePath] = cleanSpecies;
      }
      
      sheet.markModified('globalImageSpecies'); // Force Mongoose to detect changes
      await sheet.save();
    }

    return NextResponse.json({ 
      success: true,
      sheetsUpdated: allSheets.length
    });
    
  } catch (error) {
    console.error('Error updating global species:', error);
    return NextResponse.json({ 
      error: 'Failed to update global species' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ 
        error: 'Filename is required' 
      }, { status: 400 });
    }

    // Get any sheet with this filename (they should all have the same global species)
    const sheet = await ExcelData.findOne({ filename });
    
    if (!sheet) {
      return NextResponse.json({ 
        error: 'Sheet not found' 
      }, { status: 404 });
    }

    // Clean any existing encoding issues in the retrieved data
    const cleanGlobalImageSpecies = {};
    if (sheet.globalImageSpecies) {
      for (const [imagePath, species] of Object.entries(sheet.globalImageSpecies)) {
        cleanGlobalImageSpecies[imagePath] = typeof species === 'string' 
          ? species.replace(/‚Äî/g, '-').replace(/—/g, '-')
          : species;
      }
    }

    return NextResponse.json({ 
      globalImageSpecies: cleanGlobalImageSpecies
    });
    
  } catch (error) {
    console.error('Error fetching global species:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch global species' 
    }, { status: 500 });
  }
}
