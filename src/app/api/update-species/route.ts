import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';
import CsvData from '@/models/CsvData';
import path from 'path';

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const { filename, sheetName, imagePath, species } = await request.json();

    if (!filename || !sheetName || !imagePath || species === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: filename, sheetName, imagePath, species' 
      }, { status: 400 });
    }

    // Handle clearing or cleaning species string
    const isClearing = species === '' || species === 'CLEAR_SELECTION';
    const cleanSpecies = isClearing ? '' : species.replace(/‚Äî/g, '-').replace(/—/g, '-');
    

    // Find the Excel data document
    const excelDataDoc = await ExcelData.findOne({ filename, sheetName });
    
    if (!excelDataDoc) {
      return NextResponse.json({ 
        error: 'Excel data not found' 
      }, { status: 404 });
    }

    // Extract the image filename from the path
    const imageFilename = path.basename(imagePath);
    
    // Update the CSV data in MongoDB
    try {
      // Find the CSV record that matches the image filename
      const csvRecord = await CsvData.findOne({ filename: imageFilename });
      
      if (csvRecord) {
        // Map taxonomic levels to CSV columns
        const taxonomicLevels = {
          'class': 'class',
          'order': 'order', 
          'family': 'family',
          'genus': 'genus',
          'species': 'species',
          'common_name': 'common_name'
        };
        
        // Find which taxonomic level we're working with
        const currentLevel = Object.keys(taxonomicLevels).find(level => 
          sheetName.toLowerCase().includes(level.toLowerCase())
        );
        
        if (currentLevel && taxonomicLevels[currentLevel]) {
          const fieldToUpdate = taxonomicLevels[currentLevel];
          
          if (isClearing) {
            // Clear the species classification
            csvRecord[fieldToUpdate] = '';
          } else {
            // Update with the cleaned species classification
            csvRecord[fieldToUpdate] = cleanSpecies;
          }
          
          await csvRecord.save();
          console.log(`CSV record updated: ${imageFilename} -> ${fieldToUpdate} = ${cleanSpecies}`);
        } else {
          console.log(`No matching taxonomic level found for sheet: ${sheetName}`);
        }
      } else {
        console.log(`No CSV record found for image: ${imageFilename}`);
      }
      
    } catch (csvError) {
      console.error('Error updating CSV data in MongoDB:', csvError);
      // Continue with database update even if CSV update fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Species classification updated successfully',
      updatedImage: imageFilename,
      species: cleanSpecies
    });
    
  } catch (error) {
    console.error('Error updating species classification:', error);
    return NextResponse.json({ 
      error: 'Failed to update species classification' 
    }, { status: 500 });
  }
}
