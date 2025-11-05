import api from './api';

// Flow node (can be a station or a check)
export interface FlowNode {
  id: string;
  type: 'station' | 'check';
  template_id: string;
  position: {
    x: number;
    y: number;
  };
}

// Flow edge
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

export interface Flow {
  _id: string;
  flow_id: string;
  version: string;
  name: string;
  pipeline: 'copper' | 'silver' | 'gold';
  status: 'draft' | 'active' | 'archived';
  nodes: FlowNode[];
  edges: FlowEdge[];
  created_by: string;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFlowRequest {
  flow_id: string;
  version: string;
  name: string;
  pipeline: 'copper' | 'silver' | 'gold';
  nodes?: FlowNode[];
  edges?: FlowEdge[];
  effective_date: string;
}

export const flowService = {
  /**
   * Get all flows
   */
  async getFlows(params?: { status?: string; pipeline?: string }): Promise<Flow[]> {
    const response = await api.get('/flows', { params });
    return response.data.data;
  },

  /**
   * Get active flow for a pipeline
   */
  async getActiveFlow(pipeline: string): Promise<Flow> {
    const response = await api.get(`/flows/active/${pipeline}`);
    return response.data.data;
  },

  /**
   * Get single flow by ID
   */
  async getFlow(id: string): Promise<Flow> {
    const response = await api.get(`/flows/${id}`);
    return response.data.data;
  },

  /**
   * Create new flow
   */
  async createFlow(data: CreateFlowRequest): Promise<Flow> {
    const response = await api.post('/flows', data);
    return response.data.data;
  },

  /**
   * Update a draft flow
   */
  async updateFlow(id: string, data: Partial<Flow>): Promise<Flow> {
    const response = await api.patch(`/flows/${id}`, data);
    return response.data.data;
  },

  /**
   * Activate a flow
   */
  async activateFlow(id: string): Promise<Flow> {
    const response = await api.patch(`/flows/${id}/activate`);
    return response.data.data;
  },
};

