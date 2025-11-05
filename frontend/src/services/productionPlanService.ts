import api from './api';

export interface ProductionPlanItem {
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

export interface OutProductionItem {
  destination: string;
  gross_weight: number;
  drillings: number;
  sent_weight: number;
  sign_off: boolean;
}

export interface ProductionPlan {
  _id: string;
  plan_number: string;
  pass_number: string;
  start_time: string;
  end_time?: string;
  input_start_time: string;
  input_end_time?: string;
  input_items: ProductionPlanItem[];
  input_summary: {
    total_carat: number;
    total_weight: number;
    total_silver_percent: number;
    total_silver_fine: number;
    total_gold_percent: number;
    total_gold_fine: number;
  };
  output_items: OutProductionItem[];
  ocr_confidence: number;
  ocr_processed_at: string;
  original_image_url?: string;
  batch_id?: string;
  uploaded_by: {
    _id: string;
    username: string;
  };
  created_at: string;
  updated_at: string;
}

export interface UploadProductionPlanResponse {
  success: boolean;
  data?: ProductionPlan;
  error?: string;
  details?: string[];
  ocrResult?: any;
}

export const productionPlanService = {
  /**
   * Upload and process production plan form with OCR
   */
  async uploadProductionPlan(file: File): Promise<UploadProductionPlanResponse> {
    const formData = new FormData();
    formData.append('production_plan', file);

    const response = await api.post<UploadProductionPlanResponse>(
      '/api/production-plans/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },

  /**
   * Get all production plans with filters
   */
  async getProductionPlans(filters?: {
    batch_id?: string;
    plan_number?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<ProductionPlan[]> {
    const response = await api.get<{ success: boolean; data: ProductionPlan[] }>(
      '/production-plans',
      { params: filters }
    );
    return response.data.data;
  },

  /**
   * Get single production plan
   */
  async getProductionPlan(id: string): Promise<ProductionPlan> {
    const response = await api.get<{ success: boolean; data: ProductionPlan }>(
      `/api/production-plans/${id}`
    );
    return response.data.data;
  },

  /**
   * Update production plan (manual correction)
   */
  async updateProductionPlan(
    id: string,
    updates: {
      input_items?: ProductionPlanItem[];
      input_summary?: any;
      output_items?: OutProductionItem[];
    }
  ): Promise<ProductionPlan> {
    const response = await api.put<{ success: boolean; data: ProductionPlan }>(
      `/api/production-plans/${id}`,
      updates
    );
    return response.data.data;
  },

  /**
   * Link production plan to batch
   */
  async linkToBatch(id: string, batchId: string): Promise<ProductionPlan> {
    const response = await api.post<{ success: boolean; data: ProductionPlan }>(
      `/api/production-plans/${id}/link-batch`,
      { batch_id: batchId }
    );
    return response.data.data;
  },

  /**
   * Delete production plan
   */
  async deleteProductionPlan(id: string): Promise<void> {
    await api.delete(`/api/production-plans/${id}`);
  },

  /**
   * Manually create production plan without OCR
   */
  async createManualProductionPlan(data: {
    plan_number: string;
    pass_number: string;
    start_time: string;
    end_time?: string;
    input_start_time: string;
    input_end_time?: string;
    input_items: ProductionPlanItem[];
    input_summary: any;
    output_items?: OutProductionItem[];
  }): Promise<ProductionPlan> {
    const response = await api.post<{ success: boolean; data: ProductionPlan }>(
      '/api/production-plans/manual-entry',
      data
    );
    return response.data.data;
  },
};



