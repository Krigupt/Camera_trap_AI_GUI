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
  }>;
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
    isSelected: { type: Boolean, default: false }
  }],
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.ExcelData || mongoose.model<IExcelData>('ExcelData', ExcelDataSchema);
