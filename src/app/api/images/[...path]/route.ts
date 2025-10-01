import { NextRequest, NextResponse } from 'next/server';
import { getSignedUrl } from '@/lib/gcp';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const imageName = resolvedParams.path.join('/');
    const { searchParams } = new URL(request.url);
    const bucketName = searchParams.get('bucket');
    
    if (!bucketName) {
      return NextResponse.json(
        { error: 'Bucket name is required' },
        { status: 400 }
      );
    }

    // Generate signed URL for the image in GCP bucket
    const signedUrl = await getSignedUrl(bucketName, imageName, 3600); // 1 hour expiry
    
    // Determine content type based on file extension
    const extension = imageName.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (extension === 'jpg' || extension === 'jpeg') contentType = 'image/jpeg';
    else if (extension === 'png') contentType = 'image/png';
    else if (extension === 'gif') contentType = 'image/gif';
    else if (extension === 'webp') contentType = 'image/webp';

    // Return the signed URL as JSON instead of redirecting
    return NextResponse.json({
      imageUrl: signedUrl,
      success: true
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600', // 1 hour cache
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error serving image from GCP:', error);
    return NextResponse.json(
      { error: 'Image not found in GCP bucket or cannot be accessed' },
      { status: 404 }
    );
  }
}
