import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Analytics API
export const analyticsAPI = {
  // Year-to-date summary
  getYTDStats: (year?: number, pipeline?: string) => 
    api.get('/analytics/ytd', { params: { year, pipeline: pipeline === 'all' ? undefined : pipeline } }),
  
  // Operator performance
  getOperatorPerformance: (filters?: { date_from?: string; date_to?: string }) => 
    api.get('/analytics/operator-performance', { params: filters }),
  
  // CSV Export
  exportCSV: (reportType: string, filters?: Record<string, any>) => 
    api.get('/analytics/export-csv', { 
      params: { report_type: reportType, ...filters },
      responseType: 'blob',
    }),
};

export default api;
