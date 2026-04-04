# Environment Setup Guide for Camera Trap AI GUI

This guide will help you set up the environment variables for your Camera Trap AI GUI application, including MongoDB, Google Cloud Platform (GCP), and Amazon Web Services (AWS) configurations.

## Quick Setup

1. Create a `.env.local` file in the root directory of your project
2. Copy the configuration below and replace placeholder values with your actual credentials
3. Make sure `.env.local` is in your `.gitignore` file (it should already be there)

## Environment Configuration

Create a file named `.env.local` in your project root with the following content:

```bash
# =============================================================================
# Camera Trap AI GUI - Environment Configuration
# =============================================================================
# This file contains all environment variables for the Camera Trap AI GUI application
# Make sure to replace all placeholder values with your actual configuration

# ==================================================================
# =============================================================================
# MONGODB DATABASE CONFIGURATION
# =============================================================================
# MongoDB connection string
# For local MongoDB: mongodb://localhost:27017/camera-trap-ai-gui
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/camera-trap-ai-gui
MONGODB_URI=mongodb://localhost:27017/camera-trap-ai-gui

# =============================================================================
# GOOGLE CLOUD PLATFORM (GCP) CONFIGURATION
# =============================================================================
# GCP Project ID
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id

# Path to GCP service account JSON key file
# Download this from GCP Console > IAM & Admin > Service Accounts
GOOGLE_APPLICATION_CREDENTIALS=./path/to/your/gcp-service-account.json

# Default GCP Storage bucket for images
GCP_DEFAULT_BUCKET=your-default-gcp-bucket-name

# Admin dashboard at /admin — comma-separated Clerk user IDs (Dashboard → Users → copy User ID)
ADMIN_USER_IDS=user_xxxxxxxxxxxxxxxxxxxxxxxx




## Configuration Instructions

### 1. MongoDB Setup

**Local MongoDB:**
```bash
MONGODB_URI=mongodb://localhost:27017/camera-trap-ai-gui
```

**MongoDB Atlas (Cloud):**
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/camera-trap-ai-gui
```

### 2. Admin dashboard (`/admin`)

1. In [Clerk Dashboard](https://dashboard.clerk.com/) → **Users**, open your account and copy **User ID** (starts with `user_`).
2. Add to `.env.local`:
   ```bash
   ADMIN_USER_IDS=user_abc123,user_def456
   ```
3. Restart the dev server. Signed-in users whose ID is listed will see **Admin** in the header and can list all Clerk users, delete users (except themselves), and view or delete any MongoDB upload.

### 3. Google Cloud Platform (GCP) Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Cloud Storage API
4. Create a service account:
   - Go to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Assign "Storage Admin" role
   - Download the JSON key file
5. Set the environment variables:
   ```bash
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account.json
   GCP_DEFAULT_BUCKET=your-bucket-name
   ```


## Development Commands

After setting up your environment:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**: Ensure MongoDB is running and the connection string is correct
2. **GCP Authentication Error**: Verify the service account JSON file path and permissions
3. **AWS Access Denied**: Check IAM permissions and bucket policies
4. **Port Already in Use**: Change the PORT in your environment variables

### Environment Variable Validation

The application will validate required environment variables on startup. Make sure these are set:
- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLOUD_PROJECT_ID` (if using GCP)
- `AWS_ACCESS_KEY_ID` (if using AWS)

## Security Notes

1. Never commit `.env.local` to version control
2. Use different credentials for development and production
3. Rotate access keys regularly
4. Use IAM roles when possible instead of access keys
5. Enable MFA on your cloud accounts

## Support

If you encounter issues:
1. Check the application logs
2. Verify all environment variables are set correctly
3. Ensure your cloud service credentials have proper permissions
4. Check network connectivity to your services
