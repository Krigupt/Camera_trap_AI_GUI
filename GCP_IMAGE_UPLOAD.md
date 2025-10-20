# GCP Image Upload Guide

This guide explains how to upload images to Google Cloud Platform (GCP) buckets for the Camera Trap AI GUI application.

## Prerequisites

1. **Google Cloud SDK** installed and configured
   - Download from: https://cloud.google.com/sdk/docs/install
   - Verify installation: `gcloud --version`

2. **Authentication** set up
   ```bash
   gcloud auth login
   gcloud config set project dental-ai-447704
   ```

3. **Service Account** with appropriate permissions
   - Storage Admin or Storage Object Creator role

## Table of Contents

- [Method 1: Using gsutil Command Line](#method-1-using-gsutil-command-line)
- [Method 2: Using Google Cloud Console](#method-2-using-google-cloud-console)
- [Method 3: Using Python Script](#method-3-using-python-script)
- [Creating a New Bucket](#creating-a-new-bucket)
- [Troubleshooting](#troubleshooting)

---

## Method 1: Using gsutil Command Line

### Single File Upload

```bash
# Upload a single image
gsutil cp /path/to/image.jpg gs://your-bucket-name/

# Upload with specific destination path
gsutil cp /path/to/image.jpg gs://your-bucket-name/folder/image.jpg
```

### Multiple Files Upload

```bash
# Upload all JPG files from a directory
gsutil cp /path/to/images/*.jpg gs://your-bucket-name/

# Upload all images (multiple extensions)
gsutil cp /path/to/images/*.{jpg,jpeg,png,JPG,JPEG,PNG} gs://your-bucket-name/
```

### Bulk Upload (Parallel Transfer)

For faster uploads of large numbers of files, use the `-m` flag for parallel processing:

```bash
# Upload entire directory with parallel processing
gsutil -m cp /path/to/images/*.JPG gs://your-bucket-name/

# Upload directory recursively
gsutil -m cp -r /path/to/images/* gs://your-bucket-name/

# Upload with progress indicator
gsutil -m cp -r /path/to/images/* gs://your-bucket-name/ 2>&1 | tee upload.log
```

### Example: Upload P_B1 Images

```bash
# Upload all P_B1 images to the bucket
gsutil -m cp "/Volumes/orange hd/P_B1_all_images_in_one_folder/*.JPG" gs://camera-trap-p-b1-images/
```

**Note:** For paths with spaces, always use quotes around the path.

---

## Method 2: Using Google Cloud Console

### Web Interface Upload

1. Go to [Google Cloud Console](https://console.cloud.google.com/storage/browser)
2. Sign in with your Google account
3. Select your project: `dental-ai-447704`
4. Click on your bucket name (e.g., `camera-trap-p-b1-images`)
5. Click **"Upload Files"** or **"Upload Folder"** button
6. Select your images and click **Open**
7. Wait for the upload to complete

**Pros:**
- User-friendly interface
- No command line knowledge required
- Visual progress indicator

**Cons:**
- Slower for large batches
- Browser limitations on file count

---

## Method 3: Using Python Script

### Install Required Package

```bash
pip install google-cloud-storage
```

### Upload Script

Create a file named `upload_images.py`:

```python
from google.cloud import storage
import os
from pathlib import Path

def upload_images_to_bucket(bucket_name, source_folder, destination_blob_prefix=''):
    """
    Uploads all images from a local folder to a GCS bucket.
    
    Args:
        bucket_name: Name of the GCS bucket
        source_folder: Local folder path containing images
        destination_blob_prefix: Optional prefix for destination path in bucket
    """
    # Initialize the storage client
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    
    # Get all image files
    image_extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']
    image_files = []
    
    for ext in image_extensions:
        image_files.extend(Path(source_folder).glob(f'*{ext}'))
    
    print(f"Found {len(image_files)} images to upload")
    
    # Upload each file
    uploaded_count = 0
    for local_file in image_files:
        blob_name = f"{destination_blob_prefix}{local_file.name}"
        blob = bucket.blob(blob_name)
        
        try:
            blob.upload_from_filename(str(local_file))
            uploaded_count += 1
            if uploaded_count % 100 == 0:
                print(f"Uploaded {uploaded_count}/{len(image_files)} images...")
        except Exception as e:
            print(f"Error uploading {local_file.name}: {e}")
    
    print(f"\nUpload complete! {uploaded_count}/{len(image_files)} images uploaded successfully.")

if __name__ == "__main__":
    # Configuration
    BUCKET_NAME = "camera-trap-p-b1-images"
    SOURCE_FOLDER = "/Volumes/orange hd/P_B1_all_images_in_one_folder"
    
    # Run the upload
    upload_images_to_bucket(BUCKET_NAME, SOURCE_FOLDER)
```

### Run the Script

```bash
# Set up authentication (if not already done)
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"

# Run the upload script
python upload_images.py
```

---

## Creating a New Bucket

### Using gcloud Command

```bash
# Create a new bucket
gsutil mb -p dental-ai-447704 -c STANDARD -l US gs://your-new-bucket-name/

# Example: Create bucket for P_B1 images
gsutil mb -p dental-ai-447704 -c STANDARD -l US gs://camera-trap-p-b1-images/
```

### Bucket Naming Rules

- Must be globally unique
- Use lowercase letters, numbers, hyphens, and underscores
- Must start and end with a number or letter
- Cannot contain spaces
- 3-63 characters long

### Storage Classes

- `STANDARD` - Best for frequently accessed data
- `NEARLINE` - Best for data accessed less than once a month
- `COLDLINE` - Best for data accessed less than once a quarter
- `ARCHIVE` - Best for data accessed less than once a year

### Locations

- `US` - Multi-region in United States
- `EU` - Multi-region in European Union
- `ASIA` - Multi-region in Asia
- Or specific regions like `us-central1`, `us-east1`, etc.

---

## Checking Upload Progress

### Count uploaded files

```bash
# Count files in bucket
gsutil ls gs://your-bucket-name/ | wc -l

# List first 10 files
gsutil ls gs://your-bucket-name/ | head -10

# Get bucket size
gsutil du -s gs://your-bucket-name/
```

### Monitor upload in real-time

```bash
# Check upload progress every 30 seconds
watch -n 30 'gsutil ls gs://your-bucket-name/ | wc -l'
```

---

## Setting Bucket Permissions

### Make bucket publicly readable (if needed)

```bash
# Make all objects in bucket publicly readable
gsutil iam ch allUsers:objectViewer gs://your-bucket-name

# Or make individual file public
gsutil acl ch -u AllUsers:R gs://your-bucket-name/image.jpg
```

### Set uniform bucket-level access

```bash
gsutil uniformbucketlevelaccess set on gs://your-bucket-name/
```

---

## Verifying Uploaded Images

### List all images

```bash
# List all images
gsutil ls gs://camera-trap-p-b1-images/

# List with details (size, date)
gsutil ls -l gs://camera-trap-p-b1-images/

# Count total images
gsutil ls gs://camera-trap-p-b1-images/ | wc -l
```

### Download a sample image to verify

```bash
# Download one image to test
gsutil cp gs://camera-trap-p-b1-images/P_B1_210121_00022.JPG ./test-download.jpg
```

---

## Troubleshooting

### Authentication Issues

```bash
# Re-authenticate
gcloud auth login

# Check current authentication
gcloud auth list

# Set the correct project
gcloud config set project dental-ai-447704
```

### Permission Errors

If you get permission errors:

1. Ensure your service account has the correct roles:
   - Storage Admin
   - Storage Object Creator

2. Update IAM permissions:
   ```bash
   gcloud projects add-iam-policy-binding dental-ai-447704 \
     --member="serviceAccount:images@dental-ai-447704.iam.gserviceaccount.com" \
     --role="roles/storage.admin"
   ```

### Slow Upload Speed

1. Use the `-m` flag for parallel processing
2. Check your internet connection
3. Try uploading from a different location
4. Consider using a cloud VM for large uploads

### Path with Spaces

Always quote paths with spaces:

```bash
# Correct
gsutil cp "/path/with spaces/image.jpg" gs://bucket/

# Incorrect (will fail)
gsutil cp /path/with spaces/image.jpg gs://bucket/
```

### Resume Interrupted Uploads

gsutil automatically tracks and resumes interrupted uploads. If an upload is interrupted, simply run the same command again, and it will continue from where it left off.

---

## Best Practices

1. **Use Parallel Upload** (`-m` flag) for large batches
2. **Organize with folders** - Use prefixes to organize images
3. **Consistent naming** - Keep image filenames consistent
4. **Backup locally** - Always keep a local copy before uploading
5. **Verify uploads** - Check file count after upload completes
6. **Set lifecycle policies** - Automatically archive old data
7. **Monitor costs** - Keep track of storage and egress costs

---

## Cost Optimization

### Storage Pricing (as of 2024)

- **Standard Storage:** ~$0.020 per GB/month
- **Nearline Storage:** ~$0.010 per GB/month
- **Coldline Storage:** ~$0.004 per GB/month
- **Archive Storage:** ~$0.0012 per GB/month

### Estimate Storage Cost

```bash
# Get total bucket size
gsutil du -s -h gs://your-bucket-name/

# Example: If you have 100 GB of images
# Standard: 100 GB × $0.020 = $2.00/month
# Nearline: 100 GB × $0.010 = $1.00/month
```

---

## Integration with Camera Trap AI GUI

### Update .env.local

After creating a new bucket, update your `.env.local` file:

```bash
GCP_DEFAULT_BUCKET=camera-trap-p-b1-images
```

### Update Excel/CSV Files

Ensure your Excel or CSV files reference the correct bucket name:

```csv
Human,AI,Filenames,Bucket
,,P_B1_210121_00022.JPG,camera-trap-p-b1-images
,,P_B1_210121_00023.JPG,camera-trap-p-b1-images
```

---

## Quick Reference Commands

```bash
# Create bucket
gsutil mb -p dental-ai-447704 -c STANDARD -l US gs://bucket-name/

# Upload single file
gsutil cp image.jpg gs://bucket-name/

# Upload multiple files (parallel)
gsutil -m cp /path/to/images/*.JPG gs://bucket-name/

# List bucket contents
gsutil ls gs://bucket-name/

# Count files
gsutil ls gs://bucket-name/ | wc -l

# Get bucket size
gsutil du -s -h gs://bucket-name/

# Make bucket public
gsutil iam ch allUsers:objectViewer gs://bucket-name

# Delete bucket
gsutil rm -r gs://bucket-name/
```

---

## Example: Complete Workflow

Here's a complete example of creating a bucket and uploading images:

```bash
# Step 1: Authenticate
gcloud auth login
gcloud config set project dental-ai-447704

# Step 2: Create bucket
gsutil mb -p dental-ai-447704 -c STANDARD -l US gs://camera-trap-p-b1-images/

# Step 3: Upload images (parallel)
gsutil -m cp "/Volumes/orange hd/P_B1_all_images_in_one_folder/*.JPG" gs://camera-trap-p-b1-images/

# Step 4: Verify upload
gsutil ls gs://camera-trap-p-b1-images/ | wc -l

# Step 5: Check one image
gsutil ls gs://camera-trap-p-b1-images/ | head -1

# Step 6: Update your application's .env.local file
echo "GCP_DEFAULT_BUCKET=camera-trap-p-b1-images" >> .env.local
```

---

## Support

For issues or questions:
- GitHub: https://github.com/Krigupt/Camera_trap_AI_GUI
- GCP Documentation: https://cloud.google.com/storage/docs
- gsutil Documentation: https://cloud.google.com/storage/docs/gsutil

---

## Current Bucket Information

**Project:** dental-ai-447704

**Active Buckets:**
- `camera-trap-images-1759534290` - Original bucket
- `camera-trap-p-b1-images` - New bucket for P_B1 images

**Current Upload Status:**
- **Bucket:** camera-trap-p-b1-images
- **Source:** /Volumes/orange hd/P_B1_all_images_in_one_folder
- **Total Images:** 3,160 JPG files
- **Upload Command Used:** `gsutil -m cp "/Volumes/orange hd/P_B1_all_images_in_one_folder/*.JPG" gs://camera-trap-p-b1-images/`

---

**Last Updated:** October 11, 2025

