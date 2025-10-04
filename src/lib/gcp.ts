import { Storage } from '@google-cloud/storage';

// Initialize GCP Storage client
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export interface BucketInfo {
  name: string;
  location: string;
  created: Date;
}

export interface ImageInfo {
  name: string;
  url: string;
  size: number;
  contentType: string;
}

/**
 * List all available GCP buckets
 */
export async function listBuckets(): Promise<BucketInfo[]> {
  try {
    const [buckets] = await storage.getBuckets();
    return buckets.map(bucket => ({
      name: bucket.name,
      location: bucket.metadata?.location || 'Unknown',
      created: bucket.metadata?.timeCreated ? new Date(bucket.metadata.timeCreated) : new Date()
    }));
  } catch (error) {
    console.error('Error listing buckets:', error);
    throw new Error('Failed to list GCP buckets');
  }
}

/**
 * List images in a specific bucket
 */
export async function listImagesInBucket(bucketName: string, prefix?: string): Promise<ImageInfo[]> {
  try {
    const bucket = storage.bucket(bucketName);
    const [files] = await bucket.getFiles({ prefix });
    
    return files.map(file => ({
      name: file.name,
      url: `https://storage.googleapis.com/${bucketName}/${file.name}`,
      size: parseInt(String(file.metadata?.size || '0')),
      contentType: file.metadata?.contentType || 'image/jpeg'
    }));
  } catch (error) {
    console.error('Error listing images in bucket:', error);
    throw new Error(`Failed to list images in bucket: ${bucketName}`);
  }
}

/**
 * Get a signed URL for an image in a bucket
 */
export async function getSignedUrl(bucketName: string, fileName: string, expiresIn: number = 3600): Promise<string> {
  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);
    
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });
    
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error(`Failed to generate signed URL for ${fileName}`);
  }
}

/**
 * Check if a bucket exists and is accessible
 */
export async function checkBucketAccess(bucketName: string): Promise<boolean> {
  try {
    const bucket = storage.bucket(bucketName);
    const [exists] = await bucket.exists();
    return exists;
  } catch (error) {
    console.error('Error checking bucket access:', error);
    return false;
  }
}
