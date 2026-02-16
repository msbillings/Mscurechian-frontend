import { ADMIN_ENDPOINTS } from '../config';
import { apiClient } from '../api';
import type {
  DashboardStats,
  Hospital,
  Doctor,
  Patient,
  Helpdesk,
  Pharma,
  Labs,
  AuditLog,
  SupportTicket,
  CreateAdminRequest,
  CreateDoctorRequest,
  CreateHelpdeskRequest,
  CreatePharmaRequest,
  CreateLabsRequest,
  CreateHospitalRequest,
  AssignDoctorRequest,
  BroadcastRequest
} from '../types';

export const adminService = {
  // Expose for custom/emergency calls
  apiClient,

  // Client-side
  getDashboardClient: () =>
    apiClient<DashboardStats>(ADMIN_ENDPOINTS.DASHBOARD),

  getUsersClient: (params?: { role?: string }) => {
    const url = params?.role ? `${ADMIN_ENDPOINTS.USERS}?role=${params.role}` : ADMIN_ENDPOINTS.USERS;
    return apiClient<any[]>(url);
  },

  getHospitalsClient: () =>
    apiClient<Hospital[]>(ADMIN_ENDPOINTS.HOSPITALS),

  updateHospitalClient: (id: string, data: Partial<CreateHospitalRequest>) =>
    apiClient<Hospital>(ADMIN_ENDPOINTS.UPDATE_HOSPITAL(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteHospitalClient: (id: string) =>
    apiClient<void>(ADMIN_ENDPOINTS.DELETE_HOSPITAL(id), {
      method: 'DELETE',
    }),

  updateHospitalStatusClient: (id: string, status: string) =>
    apiClient<Hospital>(ADMIN_ENDPOINTS.UPDATE_HOSPITAL_STATUS(id), {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getDoctorsClient: () =>
    apiClient<Doctor[]>(ADMIN_ENDPOINTS.DOCTORS),

  getPatientsClient: () =>
    apiClient<Patient[]>(ADMIN_ENDPOINTS.PATIENTS),

  getHelpdesksClient: () =>
    apiClient<Helpdesk[]>(ADMIN_ENDPOINTS.HELPDESKS),

  createAdminClient: (data: CreateAdminRequest) =>
    apiClient<any>(ADMIN_ENDPOINTS.CREATE_ADMIN, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createHospitalAdminClient: (data: CreateAdminRequest & { hospitalId: string }) =>
    apiClient<any>(ADMIN_ENDPOINTS.CREATE_HOSPITAL_ADMIN, {
      method: 'POST',
      body: JSON.stringify({ ...data, role: 'hospital-admin' }),
    }),

  createDoctorClient: (data: CreateDoctorRequest) =>
    apiClient<Doctor>(ADMIN_ENDPOINTS.CREATE_DOCTOR, {
      method: 'POST',
      body: JSON.stringify({ ...data, role: 'doctor' }),
    }),

  createHelpdeskClient: (data: CreateHelpdeskRequest) =>
    apiClient<Helpdesk>(ADMIN_ENDPOINTS.ASSIGN_HELPDESK, {
      method: 'POST',
      body: JSON.stringify({ ...data, role: 'helpdesk' }),
    }),

  createPharmaClient: (data: CreatePharmaRequest) =>
    apiClient<Pharma>(ADMIN_ENDPOINTS.CREATE_HOSPITAL_ADMIN, {
      method: 'POST',
      body: JSON.stringify({ ...data, role: 'pharma-owner' }),
    }),

  createLabsClient: (data: CreateLabsRequest) =>
    apiClient<Labs>(ADMIN_ENDPOINTS.CREATE_HOSPITAL_ADMIN, {
      method: 'POST',
      body: JSON.stringify({ ...data, role: 'lab' }),
    }),

  createHospitalClient: (data: CreateHospitalRequest) => {
    // Clean payload - remove hospitalId as backend generates it
    const cleanData: any = { ...data };
    
    // Remove hospitalId if present (backend generates it)
    delete cleanData.hospitalId;
    
    // Ensure consistent field naming for backend
    if (cleanData.specialities && cleanData.specialities.length > 0) {
      cleanData.specialities = cleanData.specialities;
    } else if (cleanData.specialties && cleanData.specialties.length > 0) {
      cleanData.specialities = cleanData.specialties;
      delete cleanData.specialties;
    }
    
    // Ensure ambulanceAvailability is boolean
    if (cleanData.ambulanceAvailability !== undefined) {
      cleanData.ambulanceAvailability = Boolean(cleanData.ambulanceAvailability);
    }
    
    // Remove only undefined values (keep empty strings, backend handles them)
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });

    return apiClient<Hospital>(ADMIN_ENDPOINTS.CREATE_HOSPITAL, {
      method: 'POST',
      body: JSON.stringify(cleanData),
    });
  },

  assignDoctorClient: (data: AssignDoctorRequest) =>
    apiClient<any>(ADMIN_ENDPOINTS.ASSIGN_DOCTOR, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        // Ensure both field variants are sent for compatibility
        doctorId: data.doctorProfileId || data.doctorId,
        doctorProfileId: data.doctorProfileId || data.doctorId
      }),
    }),

  broadcastClient: (data: BroadcastRequest) =>
    apiClient<any>(ADMIN_ENDPOINTS.BROADCAST, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUserClient: (id: string, data: any) =>
    apiClient<any>(ADMIN_ENDPOINTS.UPDATE_USER(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteHelpdeskClient: async (id: string) => {
    return apiClient<void>(ADMIN_ENDPOINTS.DELETE_HELPDESK(id), {
      method: 'DELETE',
    });
  },

  deleteUserClient: async (id: string, role?: string) => {
    // If it's a helpdesk, use the dedicated helpdesk endpoint
    if (role === 'helpdesk') {
      return apiClient<void>(ADMIN_ENDPOINTS.DELETE_HELPDESK(id), {
        method: 'DELETE',
      });
    }

    const endpointsToTry = [
      ADMIN_ENDPOINTS.DELETE_USER(id, role),
      // Fallback: Try without role if role was provided
      ...(role ? [ADMIN_ENDPOINTS.DELETE_USER(id)] : []),
    ];

    let lastError: any;

    for (const url of endpointsToTry) {
      try {
        await apiClient<void>(url, { method: 'DELETE' });
        return; // Success - resource deleted
      } catch (err: any) {
        // Check if it's a 404 (resource not found or already deleted)
        const is404 = err.status === 404 ||
          err.message?.includes('404') ||
          err.message?.toLowerCase().includes('not found') ||
          err.message === 'API Error';

        if (is404) {
          // 404 means resource doesn't exist (already deleted or wrong endpoint)
          lastError = err;
          continue;
        } else {
          // Non-404 error - this is a real problem
          throw err;
        }
      }
    }

    // If all attempts resulted in 404s, consider it success (idempotent delete)
    if (lastError) {
      const is404 = lastError.status === 404 ||
        lastError.message?.includes('404') ||
        lastError.message?.toLowerCase().includes('not found') ||
        lastError.message === 'API Error';

      if (is404) {
        // Silently succeed - resource is already deleted
        return;
      }
      // Real error - throw it
      throw lastError;
    }
  },

  getAuditsClient: () =>
    apiClient<AuditLog[]>(ADMIN_ENDPOINTS.AUDITS),

  getHospitalWithDoctorsClient: (id: string) =>
    apiClient<Hospital>(ADMIN_ENDPOINTS.HOSPITAL_DETAILS(id)),

  getDoctorsByHospitalClient: (id: string) =>
    apiClient<any[]>(ADMIN_ENDPOINTS.HOSPITAL_DOCTORS(id)),

  getSupportRequestsClient: () =>
    apiClient<SupportTicket[]>(ADMIN_ENDPOINTS.SUPPORT_REQUESTS),

  // Leave Management
  requestLeaveClient: (data: any) =>
    apiClient<any>('/leaves/request', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getLeavesClient: () =>
    apiClient<{ leaves: any[] }>('/leaves?all=true'),

  updateLeaveStatusClient: (id: string, data: any) =>
    apiClient<any>(`/leaves/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getLeaveByIdClient: (id: string) =>
    apiClient<{ leave: any }>(`/leaves/${id}`),

  getMyLeavesClient: () =>
    apiClient<{ leaves: any[] }>('/leaves/my'),
};