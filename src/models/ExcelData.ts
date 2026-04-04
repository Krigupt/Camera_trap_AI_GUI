import mongoose, { Schema, Document } from 'mongoose';

export interface IExcelData extends Document {
  filename: string;
  sheetName: string;
  bucketName: string; // GCP bucket name for images
  /** Clerk user id — scopes uploads to the signed-in user */
  clerkUserId?: string;
  /** One id per Excel upload — all sheets from the same file share this */
  uploadGroupId?: string;
  data: Array<{
    human: string;
    ai: string;
    filenames?: string;
    imagePaths?: string[];
    tags?: string[];
    isSelected?: boolean;
    imageTags?: { [imagePath: string]: string[] }; // Individual image tags
  }>;
  globalImageTags?: { [imagePath: string]: string[] }; // Global tags across all sheets (DEPRECATED - use sheetSpecificImageTags)
  sheetSpecificImageTags?: { [sheetName: string]: { [imagePath: string]: string[] } }; // Sheet-specific tags
  globalImageSpecies?: { [imagePath: string]: string }; // Global species classifications across all sheets
  uploadedAt: Date;
}

const ExcelDataSchema: Schema = new Schema({
  filename: {
    type: String,
    required: true,
  },
  sheetName: {
    type: String,
    required: true,
  },
  bucketName: {
    type: String,
    required: true,
  },
  clerkUserId: {
    type: String,
    index: true,
  },
  uploadGroupId: {
    type: String,
    index: true,
  },
  data: [{
    human: String,
    ai: String,
    filenames: String,
    imagePaths: [String],
    tags: [String],
    isSelected: { type: Boolean, default: false },
    imageTags: { type: Schema.Types.Mixed, default: {} } // Individual image tags
  }],
  globalImageTags: { type: Schema.Types.Mixed, default: {} }, // Global tags across all sheets (DEPRECATED - use sheetSpecificImageTags)
  sheetSpecificImageTags: { type: Schema.Types.Mixed, default: {} }, // Sheet-specific tags
  globalImageSpecies: { type: Schema.Types.Mixed, default: {} }, // Global species classifications across all sheets
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.ExcelData || mongoose.model<IExcelData>('ExcelData', ExcelDataSchema);
