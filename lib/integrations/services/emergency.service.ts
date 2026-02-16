import { emergencyApiClient } from "../api/emergencyApiClient";
import {
  EmergencyLoginResponse,
  EmergencyRequest,
  CreateEmergencyRequestData,
  Hospital,
} from "../types/emergency";

const EMERGENCY_ENDPOINTS = {
  LOGIN: "/emergency/auth/login",
  LOGOUT: "/emergency/auth/logout",
  REFRESH: "/emergency/auth/refresh",
  ME: "/emergency/auth/me",
  CREATE_REQUEST: "/emergency/requests",
  MY_REQUESTS: "/emergency/requests/my-requests",
  HOSPITALS: "/emergency/requests/hospitals",
  CREATE_PATIENT_REQUEST: "/emergency/requests/patient",
} as const;

class EmergencyService {
  // Authentication
  async login(
    identifier: string,
    password: string,
  ): Promise<EmergencyLoginResponse> {
    const response = await emergencyApiClient<EmergencyLoginResponse>(
      EMERGENCY_ENDPOINTS.LOGIN,
      {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      },
    );
    return response;
  }

  async logout(refreshToken: string): Promise<void> {
    await emergencyApiClient(EMERGENCY_ENDPOINTS.LOGOUT, {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    return await emergencyApiClient(EMERGENCY_ENDPOINTS.REFRESH, {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  async getCurrentUser(): Promise<{ user: any }> {
    return await emergencyApiClient(EMERGENCY_ENDPOINTS.ME, {
      method: "GET",
    });
  }

  // Emergency Requests
  async createEmergencyRequest(data: CreateEmergencyRequestData): Promise<{
    message: string;
    request: EmergencyRequest;
  }> {
    return await emergencyApiClient(EMERGENCY_ENDPOINTS.CREATE_REQUEST, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createPatientEmergencyRequest(data: any): Promise<{
    message: string;
    request: EmergencyRequest;
  }> {
    const { apiClient } = await import("../api/apiClient");
    return await apiClient(EMERGENCY_ENDPOINTS.CREATE_PATIENT_REQUEST, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMyRequests(): Promise<{ requests: EmergencyRequest[] }> {
    return await emergencyApiClient(EMERGENCY_ENDPOINTS.MY_REQUESTS, {
      method: "GET",
    });
  }

  async getAvailableHospitals(): Promise<{ hospitals: Hospital[] }> {
    return await emergencyApiClient(EMERGENCY_ENDPOINTS.HOSPITALS, {
      method: "GET",
    });
  }
}

export const emergencyService = new EmergencyService();
