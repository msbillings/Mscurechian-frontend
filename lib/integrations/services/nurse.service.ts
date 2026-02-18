import { apiClient } from "../api/apiClient";
import { NURSE_ENDPOINTS } from "../config/endpoints";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  diagnosis?: string;
  doctor?: { _id: string; name: string };
}

export interface NurseTask {
  _id: string;
  patientId: string;
  patientName: string;
  taskType: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed";
  dueTime?: string;
  assignedBy?: string;
  notes?: string;
}

export interface NurseDashboardStats {
  totalPatients: number;
  pendingTasks: number;
  completedTasks: number;
  criticalPatients: number;
  todayAdmissions?: number;
  todayDischarges?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  total: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const NurseService = {
  // ─── Dashboard ──────────────────────────────────────────────────────────────

  /** GET /nurse/dashboard/stats */
  getDashboardStats: async (): Promise<NurseDashboardStats> => {
    const response: any = await apiClient(NURSE_ENDPOINTS.DASHBOARD.STATS);
    return (
      response.stats ||
      response.data ||
      response || {
        totalPatients: 0,
        pendingTasks: 0,
        completedTasks: 0,
        criticalPatients: 0,
      }
    );
  },

  // ─── Patients ────────────────────────────────────────────────────────────────

  /** GET /nurse/patients?page=&limit=&ward=&status= */
  getPatients: async (
    page = 1,
    limit = 20,
    filters?: { ward?: string; status?: string },
  ): Promise<PaginatedResponse<NursePatient>> => {
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (filters?.ward) query.append("ward", filters.ward);
    if (filters?.status) query.append("status", filters.status);

    const response: any = await apiClient(
      `${NURSE_ENDPOINTS.PATIENTS.BASE}?${query.toString()}`,
    );
    return {
      data: response.data || response.patients || [],
      currentPage: response.currentPage || page,
      totalPages: response.totalPages || 1,
      total: response.total || 0,
    };
  },

  /** GET /nurse/patients/:id */
  getPatientById: async (id: string): Promise<NursePatient> => {
    const response: any = await apiClient(NURSE_ENDPOINTS.PATIENTS.BY_ID(id));
    return response.patient || response;
  },

  // ─── Tasks ───────────────────────────────────────────────────────────────────

  /** GET /nurse/tasks?page=&limit=&status=&priority= */
  getTasks: async (
    page = 1,
    limit = 20,
    filters?: { status?: string; priority?: string },
  ): Promise<PaginatedResponse<NurseTask>> => {
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (filters?.status) query.append("status", filters.status);
    if (filters?.priority) query.append("priority", filters.priority);

    const response: any = await apiClient(
      `${NURSE_ENDPOINTS.TASKS.BASE}?${query.toString()}`,
    );
    return {
      data: response.data || response.tasks || [],
      currentPage: response.currentPage || page,
      totalPages: response.totalPages || 1,
      total: response.total || 0,
    };
  },

  /** PUT /nurse/tasks/:id  – update task status */
  updateTaskStatus: async (
    id: string,
    status: "pending" | "in-progress" | "completed",
    notes?: string,
  ): Promise<{ message: string; task?: NurseTask }> => {
    return apiClient(NURSE_ENDPOINTS.TASKS.UPDATE_STATUS(id), {
      method: "PUT",
      body: JSON.stringify({ status, notes }),
    });
  },

  // ─── React Query key helpers ─────────────────────────────────────────────────
  queryKeys: {
    all: () => ["nurse"] as const,
    dashboard: () => ["nurse", "dashboard"] as const,
    patients: (filters?: {
      page?: number;
      limit?: number;
      ward?: string;
      status?: string;
    }) => ["nurse", "patients", filters] as const,
    patientById: (id: string) => ["nurse", "patients", id] as const,
    tasks: (filters?: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
    }) => ["nurse", "tasks", filters] as const,
    taskById: (id: string) => ["nurse", "tasks", id] as const,
  },
};
