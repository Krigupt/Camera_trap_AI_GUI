import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const imageName = resolvedParams.path.join('/');
    const basePath = '/Users/krishnagupta/Desktop/internship/cameratrapai/P_B1_all_images';
    const fullPath = join(basePath, imageName);

    // Check if file exists
    await stat(fullPath);

    // Read file with timeout to handle large images
    const imageBuffer = await Promise.race([
      readFile(fullPath),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('File read timeout')), 10000) // 10 second timeout
      )
    ]);
    
    // Determine content type based on file extension
    const extension = fullPath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (extension === 'jpg' || extension === 'jpeg') contentType = 'image/jpeg';
    else if (extension === 'png') contentType = 'image/png';
    else if (extension === 'gif') contentType = 'image/gif';
    else if (extension === 'webp') contentType = 'image/webp';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // 1 hour cache instead of 1 year
        'Content-Length': imageBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json(
      { error: 'Image not found or cannot be read' },
      { status: 404 }
    );
  }
}
