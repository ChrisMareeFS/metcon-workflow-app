import api from './api';

export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'operator' | 'supervisor' | 'admin' | 'analyst';
  stations: string[];
  phone_number?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: 'operator' | 'supervisor' | 'admin' | 'analyst';
  stations?: string[];
  phone_number?: string;
}

export interface UpdateUserRequest {
  email?: string;
  role?: 'operator' | 'supervisor' | 'admin' | 'analyst';
  stations?: string[];
  phone_number?: string;
  active?: boolean;
}

export const userService = {
  /**
   * Get all users (admin only)
   */
  getAll: async () => {
    const response = await api.get('/api/users');
    return response.data;
  },

  /**
   * Get all operators
   */
  getOperators: async () => {
    const response = await api.get('/api/users/operators');
    return response.data;
  },

  /**
   * Create new user
   */
  create: async (data: CreateUserRequest) => {
    const response = await api.post('/api/users', data);
    return response.data;
  },

  /**
   * Update user
   */
  update: async (id: string, data: UpdateUserRequest) => {
    const response = await api.patch(`/api/users/${id}`, data);
    return response.data;
  },

  /**
   * Delete (deactivate) user
   */
  delete: async (id: string) => {
    const response = await api.delete(`/api/users/${id}`);
    return response.data;
  },
};

export default userService;

