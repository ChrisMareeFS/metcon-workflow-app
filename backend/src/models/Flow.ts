import mongoose, { Document, Schema } from 'mongoose';

// Node in the flow (can be a station or a check)
export interface IFlowNode {
  id: string;
  type: 'station' | 'check';
  template_id: string; // References StationTemplate or CheckTemplate
  position: {
    x: number;
    y: number;
  };
  selectedSops?: string[]; // Selected SOP steps for this station
}

// Edge connecting two nodes
export interface IFlowEdge {
  id: string;
  source: string; // node id
  target: string; // node id
}

export interface IFlow extends Document {
  flow_id: string;
  version: string;
  name: string;
  pipeline: 'copper' | 'silver' | 'gold';
  status: 'draft' | 'active' | 'archived';
  nodes: IFlowNode[];
  edges: IFlowEdge[];
  created_by: mongoose.Types.ObjectId;
  effective_date: Date;
  created_at: Date;
  updated_at: Date;
}

const flowNodeSchema = new Schema<IFlowNode>({
  id: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['station', 'check'],
    required: true 
  },
  template_id: { type: String, required: true },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  selectedSops: {
    type: [String],
    default: [],
  },
}, { _id: false });

const flowEdgeSchema = new Schema<IFlowEdge>({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
}, { _id: false });

const flowSchema = new Schema<IFlow>({
  flow_id: {
    type: String,
    required: true,
  },
  version: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  pipeline: {
    type: String,
    enum: ['copper', 'silver', 'gold'],
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft',
  },
  nodes: {
    type: [flowNodeSchema],
    default: [],
  },
  edges: {
    type: [flowEdgeSchema],
    default: [],
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  effective_date: {
    type: Date,
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

// Compound unique index
flowSchema.index({ flow_id: 1, version: 1 }, { unique: true });
flowSchema.index({ status: 1, effective_date: -1 });

export const Flow = mongoose.model<IFlow>('Flow', flowSchema);

