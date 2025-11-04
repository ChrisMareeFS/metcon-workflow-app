import mongoose, { Schema, Document } from 'mongoose';

export interface IBatchEvent {
  event_id: string;
  type: string;
  timestamp: Date;
  user_id: string;
  user_name?: string;
  station?: string;
  step?: string;
  data?: Record<string, any>;
}

export interface IBatchFlag {
  type: string;
  reason: string;
  flagged_at: Date;
  flagged_by: mongoose.Types.ObjectId;
  approved_by?: mongoose.Types.ObjectId;
  approved_at?: Date;
  notes?: string;
}

export interface IRecoveryPour {
  pour_number: number;
  weight_g: number;
  timestamp: Date;
}

export interface IBatch extends Document {
  batch_number: string;
  flow_id: mongoose.Types.ObjectId;
  flow_version: string;
  pipeline: 'copper' | 'silver' | 'gold';
  status: 'created' | 'in_progress' | 'completed' | 'flagged';
  priority: 'normal' | 'high' | 'urgent';
  
  // Weight tracking
  initial_weight?: number;
  current_weight?: number;
  expected_weight?: number;
  
  // Advanced analytics fields
  received_weight_g?: number;
  fine_content_percent?: number;
  fine_grams_received?: number;
  expected_output_g?: number;
  actual_output_g?: number;
  loss_gain_g?: number;
  loss_gain_percent?: number;
  output_weight_g?: number;
  
  // Recovery tracking
  fine_content: number;
  total_recovery: number;
  total_recovery_g?: number;
  first_time_recovery_g?: number;
  overall_recovery_percent?: number;
  recovery_pours?: IRecoveryPour[];
  
  // Production plan link
  production_plan_id?: mongoose.Types.ObjectId;
  
  // Flow progress tracking
  current_node_id?: string;
  completed_node_ids: string[];
  
  // Station tracking
  current_station?: string;
  completed_stations: string[];
  progress_percent: number;
  
  // Timing
  started_at?: Date;
  completed_at?: Date;
  duration_minutes?: number;
  melting_received_at?: Date;
  first_export_at?: Date;
  ftt_hours?: number;
  
  // Additional metadata
  supplier?: string;
  drill_number?: string;
  destination?: string;
  
  // Events and flags
  events: IBatchEvent[];
  flags: IBatchFlag[];
  
  // Metadata
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const RecoveryPourSchema = new Schema({
  pour_number: { type: Number, required: true },
  weight_g: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const BatchEventSchema = new Schema({
  event_id: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: [
      'batch_created',
      'batch_started',
      'station_started',
      'station_completed',
      'step_completed',
      'mass_check',
      'signature_captured',
      'photo_taken',
      'exception_flagged',
      'exception_approved',
      'batch_completed'
    ]
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  user_id: { 
    type: String,
    required: true 
  },
  user_name: { 
    type: String 
  },
  station: { 
    type: String 
  },
  step: { 
    type: String 
  },
  data: { 
    type: Schema.Types.Mixed 
  },
}, { _id: false });

const BatchFlagSchema = new Schema({
  type: { 
    type: String, 
    required: true,
    enum: [
      'out_of_tolerance',
      'equipment_issue',
      'quality_concern',
      'safety_incident',
      'other'
    ]
  },
  reason: { 
    type: String, 
    required: true 
  },
  flagged_at: { 
    type: Date, 
    default: Date.now 
  },
  flagged_by: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  approved_by: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  approved_at: { 
    type: Date 
  },
  notes: { 
    type: String 
  },
}, { _id: false });

const BatchSchema = new Schema({
  batch_number: { 
    type: String, 
    required: true,
    unique: true,
    index: true 
  },
  flow_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Flow',
    required: true 
  },
  flow_version: {
    type: String,
    required: true
  },
  pipeline: { 
    type: String, 
    enum: ['copper', 'silver', 'gold'],
    required: true,
    index: true 
  },
  status: { 
    type: String, 
    enum: ['created', 'in_progress', 'completed', 'flagged'],
    default: 'created',
    index: true 
  },
  priority: { 
    type: String, 
    enum: ['normal', 'high', 'urgent'],
    default: 'normal' 
  },
  
  // Weight tracking
  initial_weight: { 
    type: Number 
  },
  current_weight: { 
    type: Number 
  },
  expected_weight: { 
    type: Number 
  },
  
  // Advanced analytics fields
  received_weight_g: { type: Number },
  fine_content_percent: { type: Number },
  fine_grams_received: { type: Number },
  expected_output_g: { type: Number },
  actual_output_g: { type: Number },
  loss_gain_g: { type: Number },
  loss_gain_percent: { type: Number },
  output_weight_g: { type: Number },
  
  // Recovery tracking
  fine_content: { 
    type: Number, 
    default: 0 
  },
  total_recovery: { 
    type: Number, 
    default: 0 
  },
  total_recovery_g: { type: Number },
  first_time_recovery_g: { type: Number },
  overall_recovery_percent: { type: Number },
  recovery_pours: [RecoveryPourSchema],
  
  // Production plan link
  production_plan_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'ProductionPlan',
    index: true 
  },
  
  // Flow progress tracking
  current_node_id: { type: String },
  completed_node_ids: [{ type: String }],
  
  // Station tracking
  current_station: { 
    type: String 
  },
  completed_stations: [{ 
    type: String 
  }],
  progress_percent: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 100 
  },
  
  // Timing
  started_at: { 
    type: Date 
  },
  completed_at: { 
    type: Date 
  },
  duration_minutes: { 
    type: Number 
  },
  melting_received_at: { type: Date },
  first_export_at: { type: Date },
  ftt_hours: { type: Number },
  
  // Additional metadata
  supplier: { type: String },
  drill_number: { type: String },
  destination: { type: String },
  
  // Events and flags
  events: [BatchEventSchema],
  flags: [BatchFlagSchema],
  
  // Metadata
  created_by: { 
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
BatchSchema.index({ batch_number: 1 });
BatchSchema.index({ status: 1, priority: -1 });
BatchSchema.index({ pipeline: 1, status: 1 });
BatchSchema.index({ created_at: -1 });
BatchSchema.index({ production_plan_id: 1 });

// Calculate duration before save
BatchSchema.pre('save', function(next) {
  if (this.started_at && this.completed_at) {
    const diffMs = this.completed_at.getTime() - this.started_at.getTime();
    this.duration_minutes = Math.round(diffMs / 60000);
  }
  next();
});

export const Batch = mongoose.model<IBatch>('Batch', BatchSchema);
