import { HR_ENDPOINTS } from "../config";
import { apiClient } from "../api";

export interface HRStats {
  totalStaff: number;
  breakdown: { role: string; count: number }[];
  recentStaff: any[];
  pendingLeaves: number;
  todayAttendance: number;
}

export interface HRStaffMember {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  status: string;
  createdAt: string;
  profile?: any;
}

export interface HRLeaveRequest {
  _id: string;
  requester: {
    _id: string;
    name: string;
    role: string;
    email: string;
    mobile: string;
  };
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  leaveType: string;
}

export const hrService = {
  getStats: () => apiClient<{ data: HRStats }>(HR_ENDPOINTS.STATS),

  getAllStaff: (params?: {
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const url = new URL(HR_ENDPOINTS.STAFF.BASE, window.location.origin);
    if (params?.role) url.searchParams.set("role", params.role);
    if (params?.search) url.searchParams.set("search", params.search);
    if (params?.page) url.searchParams.set("page", params.page.toString());
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());
    return apiClient<{ data: HRStaffMember[]; pagination: any }>(
      url.pathname + url.search,
    );
  },

  getStaffDetails: (id: string) =>
    apiClient<{ data: HRStaffMember }>(HR_ENDPOINTS.STAFF.BY_ID(id)),

  createStaff: (data: any) =>
    apiClient<{ success: boolean; message: string; data: any }>(
      HR_ENDPOINTS.STAFF.BASE,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  updateStaff: (id: string, data: any) =>
    apiClient<{ success: boolean; message: string; data: any }>(
      HR_ENDPOINTS.STAFF.BY_ID(id),
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    ),

  getLeaves: (params?: { status?: string; page?: number; limit?: number }) => {
    const url = new URL(HR_ENDPOINTS.LEAVES.BASE, window.location.origin);
    if (params?.status) url.searchParams.set("status", params.status);
    if (params?.page) url.searchParams.set("page", params.page.toString());
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());
    return apiClient<{ data: HRLeaveRequest[]; pagination: any }>(
      url.pathname + url.search,
    );
  },

  updateLeaveStatus: (id: string, status: "approved" | "rejected") =>
    apiClient<{ success: boolean; message: string }>(
      HR_ENDPOINTS.LEAVES.BY_ID(id),
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    ),

  getAttendance: (params?: {
    date?: string;
    page?: number;
    limit?: number;
  }) => {
    const url = new URL(HR_ENDPOINTS.ATTENDANCE, window.location.origin);
    if (params?.date) url.searchParams.set("date", params.date);
    if (params?.page) url.searchParams.set("page", params.page.toString());
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());
    return apiClient<{ data: any[]; pagination: any }>(
      url.pathname + url.search,
    );
  },

  getPayroll: (params?: {
    month?: number;
    year?: number;
    page?: number;
    limit?: number;
  }) => {
    const url = new URL(HR_ENDPOINTS.PAYROLL, window.location.origin);
    if (params?.month) url.searchParams.set("month", params.month.toString());
    if (params?.year) url.searchParams.set("year", params.year.toString());
    if (params?.page) url.searchParams.set("page", params.page.toString());
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());
    return apiClient<{ data: any[]; pagination: any }>(
      url.pathname + url.search,
    );
  },

  getRecruitment: (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const url = new URL(HR_ENDPOINTS.RECRUITMENT, window.location.origin);
    if (params?.status) url.searchParams.set("status", params.status);
    if (params?.page) url.searchParams.set("page", params.page.toString());
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());
    return apiClient<{ data: any[]; pagination: any }>(
      url.pathname + url.search,
    );
  },

  getPerformance: (params?: {
    period?: string;
    page?: number;
    limit?: number;
  }) => {
    const url = new URL(HR_ENDPOINTS.PERFORMANCE, window.location.origin);
    if (params?.period) url.searchParams.set("period", params.period);
    if (params?.page) url.searchParams.set("page", params.page.toString());
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());
    return apiClient<{ data: any[]; pagination: any }>(
      url.pathname + url.search,
    );
  },

  getDocuments: (params?: {
    category?: string;
    page?: number;
    limit?: number;
  }) => {
    const url = new URL(HR_ENDPOINTS.DOCUMENTS, window.location.origin);
    if (params?.category) url.searchParams.set("category", params.category);
    if (params?.page) url.searchParams.set("page", params.page.toString());
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());
    return apiClient<{ data: any[]; pagination: any }>(
      url.pathname + url.search,
    );
  },

  getTraining: (params?: { page?: number; limit?: number }) => {
    const url = new URL(HR_ENDPOINTS.TRAINING, window.location.origin);
    if (params?.page) url.searchParams.set("page", params.page.toString());
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());
    return apiClient<{ data: any[]; pagination: any }>(
      url.pathname + url.search,
    );
  },
};
