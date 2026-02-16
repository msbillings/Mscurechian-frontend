import { endpoints } from '../config';
import { apiClient } from '../api';
import type {
  LoginRequest,
  RegisterRequest,
  OtpRequest,
  VerifyOtpRequest,
  AuthResponse,
  MeResponse
} from '../types';

export const authService = {
  // Client-side
  loginClient: (data: LoginRequest) =>
    apiClient<AuthResponse>(endpoints.auth.login, {
      method: 'POST',
      body: JSON.stringify(data),
    }),


  registerClient: (data: RegisterRequest) =>
    apiClient<AuthResponse>(endpoints.auth.register, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  sendOtpClient: (data: OtpRequest) =>
    apiClient<{ message: string }>(endpoints.auth.sendOtp, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyOtpClient: (data: VerifyOtpRequest) =>
    apiClient<{ message: string }>(endpoints.auth.verifyOtp, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refreshClient: (refreshToken: string) =>
    apiClient<{ tokens: { accessToken: string; refreshToken: string } }>(endpoints.auth.refresh, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  getMeClient: (options?: any) =>
    apiClient<MeResponse>(endpoints.auth.me, options),
};