import { MASTER_HELPDESK_ENDPOINTS } from "../config";
import { apiClient } from "../api";

/**
 * Master Helpdesk Service
 * Global operations for institutional oversight
 */
export const masterHelpdeskService = {
  // ==================== Dashboard ====================
  getDashboard: () =>
    apiClient<any>(MASTER_HELPDESK_ENDPOINTS.DASHBOARD),

  // ==================== Queue/Appointments ====================
  getQueue: (page: number = 1, limit: number = 20, status?: string, hospitalId?: string) => {
    let query = `${MASTER_HELPDESK_ENDPOINTS.QUEUE}?page=${page}&limit=${limit}`;
    if (status) query += `&status=${status}`;
    if (hospitalId) query += `&hospitalId=${hospitalId}`;
    return apiClient<any>(query);
  },

  // ==================== Transactions ====================
  getTransactions: (page: number = 1, limit: number = 20) =>
    apiClient<any>(`${MASTER_HELPDESK_ENDPOINTS.TRANSACTIONS}?page=${page}&limit=${limit}`),

  // ==================== Patients ====================
  getPatients: (page: number = 1, limit: number = 20, search?: string) => {
    let query = `${MASTER_HELPDESK_ENDPOINTS.PATIENTS}?page=${page}&limit=${limit}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    return apiClient<any>(query);
  },

  getPatientById: (id: string) =>
    apiClient<any>(MASTER_HELPDESK_ENDPOINTS.PATIENT_DETAILS(id)),

  getVisitHistory: (id: string) =>
    apiClient<any>(MASTER_HELPDESK_ENDPOINTS.VISIT_HISTORY(id)),

  getIPDAdmissions: (id: string) =>
    apiClient<any>(MASTER_HELPDESK_ENDPOINTS.IPD_ADMISSIONS(id)),

  // ==================== Registration ====================
  registerPatient: (data: any) =>
    apiClient<any>(MASTER_HELPDESK_ENDPOINTS.REGISTER_PATIENT, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
