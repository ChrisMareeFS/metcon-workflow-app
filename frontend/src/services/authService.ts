import api from './api';
import { User } from '../stores/authStore';

export interface LoginRequest {
  username: string;
  password: string;
  rememberDevice?: boolean;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    requires_2fa: boolean;
    temp_session_id?: string;
    user?: User;
    token?: string;
  };
  error?: string;
}

export interface Verify2FARequest {
  temp_session_id: string;
  code: string;
}

export interface Verify2FAResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
  };
  error?: string;
}

export interface Setup2FARequest {
  method: 'sms' | 'authenticator' | 'email';
  phone_number?: string;
  email?: string;
}

export interface Setup2FAResponse {
  success: boolean;
  data?: {
    qr_code?: string; // Base64 image for authenticator
    secret?: string;
    backup_codes?: string[];
  };
  error?: string;
}

export const authService = {
  /**
   * Login with username and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Verify 2FA code
   */
  async verify2FA(data: Verify2FARequest): Promise<Verify2FAResponse> {
    const response = await api.post<Verify2FAResponse>('/auth/verify-2fa', data);
    return response.data;
  },

  /**
   * Resend 2FA code
   */
  async resend2FACode(tempSessionId: string): Promise<{ success: boolean; error?: string }> {
    const response = await api.post('/auth/resend-2fa', { temp_session_id: tempSessionId });
    return response.data;
  },

  /**
   * Setup 2FA for user
   */
  async setup2FA(data: Setup2FARequest): Promise<Setup2FAResponse> {
    const response = await api.post<Setup2FAResponse>('/auth/setup-2fa', data);
    return response.data;
  },

  /**
   * Complete 2FA setup with verification code
   */
  async complete2FASetup(code: string): Promise<{ success: boolean; backup_codes?: string[]; error?: string }> {
    const response = await api.post('/auth/complete-2fa-setup', { code });
    return response.data;
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
};













