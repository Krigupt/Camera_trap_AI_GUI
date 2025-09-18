import mongoose, { Schema, Document } from 'mongoose';

export interface IExcelData extends Document {
  filename: string;
  sheetName: string;
  data: Array<{
    human: string;
    ai: string;
    filenames?: string;
    imagePaths?: string[];
    tags?: string[];
    isSelected?: boolean;
    imageTags?: { [imagePath: string]: string[] }; // Individual image tags
  }>;
  globalImageTags?: { [imagePath: string]: string[] }; // Global tags across all sheets
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
  data: [{
    human: String,
    ai: String,
    filenames: String,
    imagePaths: [String],
    tags: [String],
    isSelected: { type: Boolean, default: false },
    imageTags: { type: Schema.Types.Mixed, default: {} } // Individual image tags
  }],
  globalImageTags: { type: Schema.Types.Mixed, default: {} }, // Global tags across all sheets
  globalImageSpecies: { type: Schema.Types.Mixed, default: {} }, // Global species classifications across all sheets
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.ExcelData || mongoose.model<IExcelData>('ExcelData', ExcelDataSchema);
