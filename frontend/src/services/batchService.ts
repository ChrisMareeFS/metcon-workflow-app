import api from './api';

// Batch node (station or check in the flow)
export interface BatchNode {
  id: string;
  type: 'station' | 'check';
  template_id: string;
  name?: string;
  position: {
    x: number;
    y: number;
  };
}

// Batch event
export interface BatchEvent {
  event_id: string;
  type: string;
  timestamp: string;
  user_id: {
    _id: string;
    username: string;
    role: string;
  };
  station: string;
  step: string;
  data: Record<string, any>;
}

// Batch flag
export interface BatchFlag {
  type: string;
  step: string;
  reason: string;
  approved_by: string | { username: string; role: string } | null;
  timestamp: string;
}

// Recovery pour
export interface RecoveryPour {
  weight_g: number;
  timestamp: string;
  pour_number: number;
}

// Batch
export interface Batch {
  _id: string;
  batch_number: string;
  pipeline: 'copper' | 'silver' | 'gold';
  initial_weight?: number;
  flow_id: any; // Can be string or populated Flow object
  flow_version: string;
  current_node_id: string;
  completed_node_ids: string[];
  status: 'created' | 'in_progress' | 'flagged' | 'blocked' | 'completed';
  priority: 'normal' | 'high';
  events: BatchEvent[];
  flags: BatchFlag[];
  
  // Material & Source (for analytics)
  supplier?: string;
  drill_number?: string;
  destination?: string;
  
  // Weight & Fine Content (for analytics)
  received_weight_g?: number;
  fine_content_percent?: number;
  fine_grams_received?: number;
  output_weight_g?: number;
  recovery_pours?: RecoveryPour[];
  
  // Recovery Metrics (for analytics)
  first_time_recovery_g?: number;
  total_recovery_g?: number;
  overall_recovery_percent?: number;
  
  // Timing Milestones (for analytics)
  melting_received_at?: string | null;
  first_export_at?: string | null;
  ftt_hours?: number | null;
  
  // Loss/Gain Tracking (for analytics)
  expected_output_g?: number;
  actual_output_g?: number;
  loss_gain_g?: number;
  loss_gain_percent?: number;
  
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
  current_node?: BatchNode;
  next_node?: BatchNode;
}

// Create batch request
export interface CreateBatchRequest {
  batch_number: string;
  pipeline: 'copper' | 'silver' | 'gold';
  initial_weight?: number;
  priority?: 'normal' | 'high';
}

// Batches list response
export interface BatchesResponse {
  batches: Batch[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface FlagBatchRequest {
  exception_type: 'out_of_tolerance' | 'process_failure' | 'equipment_issue' | 'other';
  reason: string;
  notes?: string;
  step?: string;
  station?: string;
}

export interface ApproveExceptionRequest {
  flag_index?: number;
  approval_notes?: string;
}

export const batchService = {
  /**
   * Get all batches with optional filters
   */
  async getBatches(params?: {
    status?: string;
    pipeline?: string;
    limit?: number;
    offset?: number;
  }): Promise<BatchesResponse> {
    const response = await api.get('/batches', { params });
    return response.data.data;
  },

  /**
   * Get single batch with current step details
   */
  async getBatch(id: string): Promise<Batch> {
    const response = await api.get(`/batches/${id}`);
    return response.data.data;
  },

  /**
   * Create new batch
   */
  async createBatch(data: CreateBatchRequest): Promise<Batch> {
    const response = await api.post('/batches', data);
    return response.data.data;
  },

  /**
   * Start a batch (move from created to in_progress)
   */
  async startBatch(id: string): Promise<Batch> {
    const response = await api.post(`/batches/${id}/start`);
    return response.data.data;
  },

  /**
   * Complete current step and move to next
   */
  async completeStep(id: string, stepData?: Record<string, any>): Promise<Batch> {
    const response = await api.post(`/batches/${id}/complete-step`, {
      data: stepData,
    });
    return response.data.data;
  },

  /**
   * Add an event to batch
   */
  async addEvent(id: string, type: string, data?: Record<string, any>): Promise<Batch> {
    const response = await api.post(`/batches/${id}/events`, {
      type,
      data,
    });
    return response.data.data;
  },

  /**
   * Flag a batch with an exception
   */
  async flagBatch(batchId: string, flagData: FlagBatchRequest): Promise<Batch> {
    const response = await api.post(`/batches/${batchId}/flag`, flagData);
    return response.data.data;
  },

  /**
   * Approve an exception on a flagged batch
   */
  async approveException(batchId: string, approvalData: ApproveExceptionRequest): Promise<Batch> {
    const response = await api.post(`/batches/${batchId}/approve-exception`, approvalData);
    return response.data.data;
  },
};


