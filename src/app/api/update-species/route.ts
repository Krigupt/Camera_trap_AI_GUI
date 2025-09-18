import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';
import fs from 'fs';
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
    
    // Update the CSV file if it exists
    const csvPath = `/Users/krishnagupta/Desktop/internship/filtered_output_B1.csv`;
    
    if (fs.existsSync(csvPath)) {
      try {
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.split('\n');
        
        // Find the header line to get column indices
        const headerLine = lines[0];
        const headers = headerLine.split(',');
        
        // Find the column index for the current taxonomic level
        let updateColumnIndex = -1;
        const taxonomicLevels = ['Class', 'Order', 'Family', 'Genus', 'Species', 'Common_name'];
        
        // Find which taxonomic level we're working with
        const currentLevel = taxonomicLevels.find(level => 
          sheetName.toLowerCase().includes(level.toLowerCase())
        );
        
        if (currentLevel) {
          updateColumnIndex = headers.findIndex(header => 
            header.trim().toLowerCase() === currentLevel.toLowerCase()
          );
        }
        
        if (updateColumnIndex === -1) {
          // Could not find column for taxonomic level
        }
        
        // Find the filename column
        const filenameColumnIndex = headers.findIndex(header => 
          header.trim().toLowerCase().includes('filename') || 
          header.trim().toLowerCase().includes('file')
        );
        
        if (filenameColumnIndex === -1) {
          // Could not find filename column in CSV
        }
        
        // Update the CSV content
        let updated = false;
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim() === '') continue; // Skip empty lines
          
          const columns = lines[i].split(',');
          
          // Check if this row contains our image filename
          if (filenameColumnIndex !== -1 && columns[filenameColumnIndex]) {
            const csvFilename = columns[filenameColumnIndex].trim().replace(/['"]/g, '');
            
            if (csvFilename === imageFilename || csvFilename.includes(imageFilename)) {
              // Update the species column if we found the right column
              if (updateColumnIndex !== -1) {
                if (isClearing) {
                  // Clear the species classification (empty cell)
                  columns[updateColumnIndex] = '""';
                } else {
                  // Use the cleaned species classification
                  columns[updateColumnIndex] = `"${cleanSpecies}"`;
                }
                lines[i] = columns.join(',');
                updated = true;
                break; // Stop after first match
              }
            }
          }
        }
        
        console.log(`CSV update summary:`, {
          imageFilename,
          species: cleanSpecies,
          filenameColumnIndex,
          updateColumnIndex,
          currentLevel,
          headers: headers.map((h, i) => `${i}: ${h.trim()}`),
          updated
        });
        
        if (updated) {
          // Write the updated CSV back to file
          fs.writeFileSync(csvPath, lines.join('\n'));
          console.log('CSV file updated successfully');
        } else {
          console.log('No matching rows found in CSV for image:', imageFilename);
        }
        
      } catch (csvError) {
        console.error('Error updating CSV file:', csvError);
        // Continue with database update even if CSV update fails
      }
    } else {
      console.log('CSV file not found at:', csvPath);
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
