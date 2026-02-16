import { PHARMACY_ENDPOINTS } from "../config";
import { apiClient } from "../api";

export const pharmacyService = {
  /**
   * Upload a professional document (Degree/Registration certificate)
   */
  uploadDocument: (file: File | Blob, fileName: string) => {
    const formData = new FormData();
    formData.append("document", file, fileName);
    return apiClient<{ success: boolean; url: string; publicId: string }>(
      PHARMACY_ENDPOINTS.UPLOAD_DOCUMENT,
      {
        method: "POST",
        body: formData,
        headers: {}, // Let browser set Content-Type for FormData
      },
    );
  },

  getAuditLogs: async (
    page = 1,
    limit = 10,
    action?: string,
    startDate?: string,
    endDate?: string,
  ) => {
    let url = `${PHARMACY_ENDPOINTS.AUDITS}?page=${page}&limit=${limit}`;
    if (action && action !== "All Actions") url += `&action=${action}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    return apiClient<any>(url);
  },
};
