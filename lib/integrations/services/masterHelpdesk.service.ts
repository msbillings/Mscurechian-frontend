import { MASTER_HELPDESK_ENDPOINTS } from "../config";
import { apiClient } from "../api";

/**
 * Master Helpdesk Service
 * Global operations for institutional oversight
 */
export const masterHelpdeskService = {
  // ==================== Dashboard ====================
  getDashboard: (hospitalId?: string) => {
    let query = MASTER_HELPDESK_ENDPOINTS.DASHBOARD;
    if (hospitalId) query += `?hospitalId=${hospitalId}`;
    return apiClient<any>(query);
  },

  // ==================== Queue/Appointments ====================
  getQueue: (page: number = 1, limit: number = 20, status?: string, hospitalId?: string) => {
    let query = `${MASTER_HELPDESK_ENDPOINTS.QUEUE}?page=${page}&limit=${limit}`;
    if (status) query += `&status=${status}`;
    if (hospitalId) query += `&hospitalId=${hospitalId}`;
    return apiClient<any>(query);
  },

  // ==================== Transactions ====================
  getTransactions: (
    page: number = 1,
    limit: number = 20,
    hospitalId?: string,
    startDate?: string,
    endDate?: string,
    type?: string
  ) => {
    let query = `${MASTER_HELPDESK_ENDPOINTS.TRANSACTIONS}?page=${page}&limit=${limit}`;
    if (hospitalId) query += `&hospitalId=${hospitalId}`;
    if (startDate) query += `&startDate=${startDate}`;
    if (endDate) query += `&endDate=${endDate}`;
    if (type) query += `&type=${type}`;
    return apiClient<any>(query);
  },

  // ==================== Patients ====================
  getPatients: (page: number = 1, limit: number = 20, search?: string, hospitalId?: string) => {
    let query = `${MASTER_HELPDESK_ENDPOINTS.PATIENTS}?page=${page}&limit=${limit}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    if (hospitalId) query += `&hospitalId=${hospitalId}`;
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
