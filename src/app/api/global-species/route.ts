import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const { filename, imagePath, species } = await request.json();

    // Allow empty string for clearing, but check for undefined/null
    if (!filename || !imagePath || species === undefined || species === null) {
      return NextResponse.json({ 
        error: 'Missing required fields: filename, imagePath, species' 
      }, { status: 400 });
    }


    // Use atomic update to prevent race conditions when multiple taggers work on the same batch
    // This ensures that concurrent updates don't overwrite each other
    let updateResult;
    
    if (species === '' || species === 'CLEAR_SELECTION') {
      // Clear the species classification using $unset
      updateResult = await ExcelData.updateMany(
        { filename },
        {
          $unset: {
            [`globalImageSpecies.${imagePath}`]: ""
          }
        }
      );
    } else {
      // Clean species string to fix encoding issues and set it using atomic $set
      const cleanSpecies = species.replace(/‚Äî/g, '-').replace(/—/g, '-');
      updateResult = await ExcelData.updateMany(
        { filename },
        {
          $set: {
            [`globalImageSpecies.${imagePath}`]: cleanSpecies
          }
        }
      );
    }
    
    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ 
        error: 'No sheets found for filename' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      documentsUpdated: updateResult.modifiedCount
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
        (cleanGlobalImageSpecies as any)[imagePath] = typeof species === 'string'
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
