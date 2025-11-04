import mongoose, { Document, Schema } from 'mongoose';

export interface IPhoto extends Document {
  batch_id: mongoose.Types.ObjectId;
  event_id: string;
  step_id: string;
  storage_url: string;
  hash: string;
  size_bytes: number;
  exif: Record<string, any>;
  ocr_result: {
    value: number | null;
    confidence: number | null;
    raw_text: string | null;
  };
  uploaded_by: mongoose.Types.ObjectId;
  uploaded_at: Date;
}

const photoSchema = new Schema<IPhoto>({
  batch_id: {
    type: Schema.Types.ObjectId,
    ref: 'Batch',
    required: true,
  },
  event_id: {
    type: String,
    required: true,
  },
  step_id: {
    type: String,
    required: true,
  },
  storage_url: {
    type: String,
    required: true,
  },
  hash: {
    type: String,
    required: true,
  },
  size_bytes: {
    type: Number,
    required: true,
  },
  exif: {
    type: Schema.Types.Mixed,
    default: {},
  },
  ocr_result: {
    value: { type: Number, default: null },
    confidence: { type: Number, default: null },
    raw_text: { type: String, default: null },
  },
  uploaded_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  uploaded_at: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
photoSchema.index({ batch_id: 1, event_id: 1 });
photoSchema.index({ uploaded_at: -1 });

export const Photo = mongoose.model<IPhoto>('Photo', photoSchema);













