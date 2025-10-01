import { NextResponse } from 'next/server';
import { listBuckets } from '@/lib/gcp';

export async function GET() {
  try {
    const buckets = await listBuckets();
    
    return NextResponse.json({
      success: true,
      buckets: buckets.map(bucket => ({
        name: bucket.name,
        location: bucket.location,
        created: bucket.created.toISOString()
      }))
    });
    
  } catch (error) {
    console.error('Error fetching GCP buckets:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch GCP buckets. Please check your GCP credentials and permissions.' 
      },
      { status: 500 }
    );
  }
}
