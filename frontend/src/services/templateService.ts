import api from './api';

// Station Template
export interface StationTemplate {
  _id: string;
  template_id: string;
  name: string;
  description: string;
  icon: string;
  image_url?: string;
  estimated_duration?: number;
  sop?: string[];
  created_by: any;
  created_at: string;
  updated_at: string;
}

export interface CreateStationTemplateRequest {
  template_id: string;
  name: string;
  description?: string;
  icon?: string;
  image_url?: string;
  estimated_duration?: number;
  sop?: string[];
}

// Check Template
export interface CheckTemplate {
  _id: string;
  template_id: string;
  name: string;
  type: 'instruction' | 'checklist' | 'mass_check' | 'signature' | 'photo';
  instructions: string;
  icon: string;
  expected_mass?: number;
  tolerance?: number;
  tolerance_unit?: 'g' | '%';
  checklist_items?: string[];
  created_by: any;
  created_at: string;
  updated_at: string;
}

export interface CreateCheckTemplateRequest {
  template_id: string;
  name: string;
  type: 'instruction' | 'checklist' | 'mass_check' | 'signature' | 'photo';
  instructions?: string;
  icon?: string;
  expected_mass?: number;
  tolerance?: number;
  tolerance_unit?: 'g' | '%';
  checklist_items?: string[];
}

export const templateService = {
  // Station Templates
  async getStationTemplates(): Promise<StationTemplate[]> {
    const response = await api.get('/station-templates');
    return response.data.data;
  },

  async getStationTemplate(id: string): Promise<StationTemplate> {
    const response = await api.get(`/api/station-templates/${id}`);
    return response.data.data;
  },

  async createStationTemplate(data: CreateStationTemplateRequest): Promise<StationTemplate> {
    const response = await api.post('/station-templates', data);
    return response.data.data;
  },

  async updateStationTemplate(id: string, data: Partial<StationTemplate>): Promise<StationTemplate> {
    const response = await api.patch(`/api/station-templates/${id}`, data);
    return response.data.data;
  },

  async deleteStationTemplate(id: string): Promise<void> {
    await api.delete(`/api/station-templates/${id}`);
  },

  async uploadStationImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/api/station-templates/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data.image_url;
  },

  // Check Templates
  async getCheckTemplates(type?: string): Promise<CheckTemplate[]> {
    const response = await api.get('/check-templates', { params: { type } });
    return response.data.data;
  },

  async getCheckTemplate(id: string): Promise<CheckTemplate> {
    const response = await api.get(`/api/check-templates/${id}`);
    return response.data.data;
  },

  async createCheckTemplate(data: CreateCheckTemplateRequest): Promise<CheckTemplate> {
    const response = await api.post('/check-templates', data);
    return response.data.data;
  },

  async updateCheckTemplate(id: string, data: Partial<CheckTemplate>): Promise<CheckTemplate> {
    const response = await api.patch(`/api/check-templates/${id}`, data);
    return response.data.data;
  },

  async deleteCheckTemplate(id: string): Promise<void> {
    await api.delete(`/api/check-templates/${id}`);
  },
};




