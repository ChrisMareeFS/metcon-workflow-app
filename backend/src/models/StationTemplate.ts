import mongoose, { Document, Schema } from 'mongoose';

export interface IStationTemplate extends Document {
  template_id: string;
  name: string;
  description: string;
  icon: string;
  image_url?: string; // URL or base64 image data
  estimated_duration?: number; // minutes
  sop?: string[]; // Standard Operating Procedure steps
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const stationTemplateSchema = new Schema<IStationTemplate>({
  template_id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '🏭',
  },
  image_url: {
    type: String,
  },
  estimated_duration: {
    type: Number, // minutes
  },
  sop: {
    type: [String], // Standard Operating Procedure steps
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

stationTemplateSchema.index({ name: 1 });

export const StationTemplate = mongoose.model<IStationTemplate>('StationTemplate', stationTemplateSchema);




