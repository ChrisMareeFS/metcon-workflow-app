import mongoose, { Schema, Document } from 'mongoose';

export interface IProductionPlanItem {
  row_number: number;
  package_number: string;
  supplier: string;
  drill: number;
  raw_weight: number;
  silver_percent: number;
  silver_fine: number;
  gold_percent: number;
  gold_fine: number;
}

export interface IOutProductionItem {
  destination: string;
  gross_weight: number;
  drillings: number;
  sent_weight: number;
  sign_off: boolean;
}

export interface IProductionPlan extends Document {
  plan_number: string;
  pass_number: string;
  start_time: Date;
  end_time: Date;
  input_start_time: Date;
  input_end_time: Date;
  
  // Input Production
  input_items: IProductionPlanItem[];
  input_summary: {
    total_carat: number;
    total_weight: number;
    total_silver_percent: number;
    total_silver_fine: number;
    total_gold_percent: number;
    total_gold_fine: number;
  };
  
  // Out Production
  output_items: IOutProductionItem[];
  
  // OCR metadata
  ocr_confidence: number;
  ocr_processed_at: Date;
  original_image_url?: string;
  
  // Linking
  batch_id?: mongoose.Types.ObjectId;
  
  // Audit
  uploaded_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const ProductionPlanItemSchema = new Schema({
  row_number: { type: Number, required: true },
  package_number: { type: String, required: true },
  supplier: { type: String, required: true },
  drill: { type: Number, default: 0 },
  raw_weight: { type: Number, required: true },
  silver_percent: { type: Number, default: 0 },
  silver_fine: { type: Number, default: 0 },
  gold_percent: { type: Number, required: true },
  gold_fine: { type: Number, required: true },
}, { _id: false });

const OutProductionItemSchema = new Schema({
  destination: { type: String, required: true },
  gross_weight: { type: Number, required: true },
  drillings: { type: Number, default: 0 },
  sent_weight: { type: Number, required: true },
  sign_off: { type: Boolean, default: false },
}, { _id: false });

const ProductionPlanSchema = new Schema({
  plan_number: { 
    type: String, 
    required: true,
    unique: true,
    index: true 
  },
  pass_number: { 
    type: String, 
    required: true 
  },
  start_time: { 
    type: Date, 
    required: true 
  },
  end_time: { 
    type: Date 
  },
  input_start_time: { 
    type: Date, 
    required: true 
  },
  input_end_time: { 
    type: Date 
  },
  
  // Input Production
  input_items: [ProductionPlanItemSchema],
  input_summary: {
    total_carat: { type: Number, default: 0 },
    total_weight: { type: Number, default: 0 },
    total_silver_percent: { type: Number, default: 0 },
    total_silver_fine: { type: Number, default: 0 },
    total_gold_percent: { type: Number, default: 0 },
    total_gold_fine: { type: Number, default: 0 },
  },
  
  // Out Production
  output_items: [OutProductionItemSchema],
  
  // OCR metadata
  ocr_confidence: { 
    type: Number, 
    min: 0, 
    max: 1,
    required: true 
  },
  ocr_processed_at: { 
    type: Date, 
    default: Date.now 
  },
  original_image_url: { 
    type: String 
  },
  
  // Linking
  batch_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Batch',
    index: true 
  },
  
  // Audit
  uploaded_by: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for efficient queries
ProductionPlanSchema.index({ plan_number: 1 });
ProductionPlanSchema.index({ batch_id: 1 });
ProductionPlanSchema.index({ created_at: -1 });
ProductionPlanSchema.index({ uploaded_by: 1 });

export const ProductionPlan = mongoose.model<IProductionPlan>('ProductionPlan', ProductionPlanSchema);



