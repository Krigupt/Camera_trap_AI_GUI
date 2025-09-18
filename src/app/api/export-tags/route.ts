import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ExcelData from '@/models/ExcelData';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { filename } = await request.json();
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Get all sheets for this filename
    const allSheets = await ExcelData.find({ filename }).sort({ sheetName: 1 });
    
    if (allSheets.length === 0) {
      return NextResponse.json({ error: 'No data found for this file' }, { status: 404 });
    }

    // Filter for unique sheet names to avoid duplicates
    const uniqueSheets = allSheets.filter((sheet, index, self) => 
      index === self.findIndex(s => s.sheetName === sheet.sheetName)
    );

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Define tag columns
    const tagColumns = [
      'Blurry',
      'Low-light', 
      'Body part',
      'Blends in',
      'Unidentifiable to taxonomix level by human ground-truth'
    ];

    // Process each unique sheet
    for (const sheet of uniqueSheets) {
      
      // Group data by human-ai pairs
      const groupedData = new Map();
      
      sheet.data.forEach((row: any) => {
        const key = `${row.human}_vs_${row.ai}`;
        if (!groupedData.has(key)) {
          groupedData.set(key, {
            human: row.human,
            ai: row.ai,
            taggedImages: {
              'Blurry': [],
              'Low-light': [],
              'Body part': [], 
              'Blends in': [],
              'Unidentifiable to taxonomix level by human ground-truth': []
            }
          });
        }
        
        const group = groupedData.get(key);
        
        // Add filenames to appropriate tag columns based on global image tags
        if (row.imagePaths) {
          row.imagePaths.forEach((imagePath: string) => {
            // Get global tags for this image from any sheet (they should be the same)
            const globalTags = sheet.globalImageTags?.[imagePath];
            if (globalTags && globalTags.length > 0) {
              globalTags.forEach((tag: string) => {
                if (group.taggedImages[tag]) {
                  // Add this specific image to the tag column
                  if (!group.taggedImages[tag].includes(imagePath)) {
                    group.taggedImages[tag].push(imagePath);
                  }
                }
              });
            }
          });
        }
      });

      // Convert to Excel format
      const worksheetData = [];
      
      // Add headers
      const headers = ['Human', 'AI', ...tagColumns, 'Notable images'];
      worksheetData.push(headers);
      
      // Add data rows
      groupedData.forEach((group) => {
        const row = [
          group.human,
          group.ai,
          ...tagColumns.map(tag => group.taggedImages[tag].join(', ')),
          '' // Notable images column (empty for now)
        ];
        worksheetData.push(row);
      });

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths
      const columnWidths = [
        { wch: 15 }, // Human
        { wch: 15 }, // AI
        { wch: 30 }, // Blurry
        { wch: 30 }, // Low-light
        { wch: 30 }, // Body part
        { wch: 30 }, // Blends in
        { wch: 40 }, // Unidentifiable...
        { wch: 30 }  // Notable images
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName);
    }

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    });

    // Create filename for download
    const downloadFilename = `${filename.replace('.xlsx', '')}_tagged_analysis.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error exporting tagged data:', error);
    return NextResponse.json(
      { error: 'Failed to export tagged data' },
      { status: 500 }
    );
  }
}
