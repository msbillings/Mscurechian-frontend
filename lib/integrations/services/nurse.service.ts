import { apiClient } from '../api/apiClient';
import { NURSE_ENDPOINTS } from '../config/endpoints';

/**
 * Nurse Service - API calls for nurse-related operations
 * Includes pagination support for optimal performance
 */

export interface NursePatient {
    _id: string;
    name: string;
    age: number;
    gender: string;
    mobile?: string;
    bedNumber?: string;
    ward?: string;
    status?: string;
    admissionDate?: string;
}

export interface NurseTask {
    _id: string;
    patientId: string;
    patientName: string;
    taskType: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'in-progress' | 'completed';
    dueTime?: string;
    assignedBy?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    currentPage: number;
    totalPages: number;
    total: number;
}

export const NurseService = {
    // ✅ Get patients with pagination (default limit=20)
    getPatients: async (
        page: number = 1,
        limit: number = 20,
        filters?: { ward?: string; status?: string }
    ): Promise<PaginatedResponse<NursePatient>> => {
        let url = `${NURSE_ENDPOINTS.PATIENTS.BASE}?page=${page}&limit=${limit}`;
        if (filters?.ward) url += `&ward=${filters.ward}`;
        if (filters?.status) url += `&status=${filters.status}`;

        const response: any = await apiClient(url, { method: 'GET' });
        return {
            data: response.data || [],
            currentPage: response.currentPage || 1,
            totalPages: response.totalPages || 1,
            total: response.total || 0,
        };
    },

    // Get patient by ID
    getPatientById: async (id: string): Promise<NursePatient> => {
        return apiClient<NursePatient>(NURSE_ENDPOINTS.PATIENTS.BY_ID(id), { method: 'GET' });
    },

    // ✅ Get tasks with pagination (default limit=20)
    getTasks: async (
        page: number = 1,
        limit: number = 20,
        filters?: { status?: string; priority?: string }
    ): Promise<PaginatedResponse<NurseTask>> => {
        let url = `${NURSE_ENDPOINTS.TASKS.BASE}?page=${page}&limit=${limit}`;
        if (filters?.status) url += `&status=${filters.status}`;
        if (filters?.priority) url += `&priority=${filters.priority}`;

        const response: any = await apiClient(url, { method: 'GET' });
        return {
            data: response.data || [],
            currentPage: response.currentPage || 1,
            totalPages: response.totalPages || 1,
            total: response.total || 0,
        };
    },

    // Update task status
    updateTaskStatus: async (id: string, status: string): Promise<{ message: string }> => {
        return apiClient<{ message: string }>(NURSE_ENDPOINTS.TASKS.UPDATE_STATUS(id), {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
    },

    // Get dashboard stats
    getDashboardStats: async (): Promise<any> => {
        return apiClient<any>(NURSE_ENDPOINTS.DASHBOARD.STATS, { method: 'GET' });
    },

    // ✅ Query key helpers for React Query
    queryKeys: {
        all: () => ['nurse'] as const,
        patients: (filters?: { page?: number; limit?: number; ward?: string; status?: string }) =>
            ['nurse', 'patients', filters] as const,
        patientById: (id: string) => ['nurse', 'patients', id] as const,
        tasks: (filters?: { page?: number; limit?: number; status?: string; priority?: string }) =>
            ['nurse', 'tasks', filters] as const,
        taskById: (id: string) => ['nurse', 'tasks', id] as const,
        dashboard: () => ['nurse', 'dashboard'] as const,
    },
};
