import mongoose, { Document, Schema } from 'mongoose';

export interface ICheckTemplate extends Document {
  template_id: string;
  name: string;
  type: 'instruction' | 'checklist' | 'mass_check' | 'signature' | 'photo';
  instructions: string;
  icon: string;
  // Mass check specific fields
  expected_mass?: number;
  tolerance?: number;
  tolerance_unit?: 'g' | '%';
  // Checklist specific fields
  checklist_items?: string[];
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const checkTemplateSchema = new Schema<ICheckTemplate>({
  template_id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['instruction', 'checklist', 'mass_check', 'signature', 'photo'],
    required: true,
  },
  instructions: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '⚙️',
  },
  expected_mass: {
    type: Number,
  },
  tolerance: {
    type: Number,
  },
  tolerance_unit: {
    type: String,
    enum: ['g', '%'],
  },
  checklist_items: {
    type: [String],
    default: [],
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

checkTemplateSchema.index({ name: 1, type: 1 });

export const CheckTemplate = mongoose.model<ICheckTemplate>('CheckTemplate', checkTemplateSchema);













