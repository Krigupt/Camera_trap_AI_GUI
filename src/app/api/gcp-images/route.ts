import { NextRequest, NextResponse } from 'next/server';
import { listImagesInBucket, getSignedUrl } from '@/lib/gcp';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucketName = searchParams.get('bucket');
    const prefix = searchParams.get('prefix') || '';
    
    if (!bucketName) {
      return NextResponse.json(
        { error: 'Bucket name is required' },
        { status: 400 }
      );
    }
    
    const images = await listImagesInBucket(bucketName, prefix);
    
    // Generate signed URLs for each image
    const imagesWithUrls = await Promise.all(
      images.map(async (image) => ({
        ...image,
        signedUrl: await getSignedUrl(bucketName, image.name)
      }))
    );
    
    return NextResponse.json({
      success: true,
      images: imagesWithUrls,
      bucket: bucketName,
      count: imagesWithUrls.length
    });
    
  } catch (error) {
    console.error('Error fetching images from GCP bucket:', error);
    return NextResponse.json(
      { 
        success: false,
        error: `Failed to fetch images from bucket: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}
