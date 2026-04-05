import mongoose, { Schema, Document } from 'mongoose';

export interface ICsvData extends Document {
  /** Same as ExcelData.uploadGroupId for this upload session */
  uploadGroupId?: string;
  deployment_id: string;
  filename: string;
  class: string;
  order: string;
  family: string;
  genus: string;
  species: string;
  common_name: string;
  uploadedAt: Date;
}

const CsvDataSchema: Schema = new Schema({
  uploadGroupId: {
    type: String,
    index: true,
  },
  deployment_id: {
    type: String,
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  class: {
    type: String,
    default: '',
  },
  order: {
    type: String,
    default: '',
  },
  family: {
    type: String,
    default: '',
  },
  genus: {
    type: String,
    default: '',
  },
  species: {
    type: String,
    default: '',
  },
  common_name: {
    type: String,
    default: '',
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.CsvData || mongoose.model<ICsvData>('CsvData', CsvDataSchema);
