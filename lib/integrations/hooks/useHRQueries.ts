import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hrService } from "../services/hr.service";
import { performanceService } from "../services/performance.service";

export const useHRStats = () => {
  return useQuery({
    queryKey: ["hr", "stats"],
    queryFn: () => hrService.getStats(),
  });
};

export const useHRStaff = (params?: {
  role?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["hr", "staff", params],
    queryFn: () => hrService.getAllStaff(params),
  });
};

export const useHRStaffDetails = (id: string) => {
  return useQuery({
    queryKey: ["hr", "staff", id],
    queryFn: () => hrService.getStaffDetails(id),
    enabled: !!id,
  });
};

export const useHRLeaves = (params?: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["hr", "leaves", params],
    queryFn: () => hrService.getLeaves(params),
  });
};

export const useHRAttendance = (params?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: ["hr", "attendance", params],
    queryFn: () => hrService.getAttendance(params),
  });
};

export const useHRPayroll = (params?: {
  month?: number;
  year?: number;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["hr", "payroll", params],
    queryFn: () => hrService.getPayroll(params),
  });
};

export const useCreateStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => hrService.createStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "staff"] });
      queryClient.invalidateQueries({ queryKey: ["hr", "stats"] });
    },
  });
};

export const useUpdateStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      hrService.updateStaff(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["hr", "staff"] });
      queryClient.invalidateQueries({ queryKey: ["hr", "stats"] });
      queryClient.invalidateQueries({
        queryKey: ["hr", "staff", variables.id],
      });
    },
  });
};

export const useUpdateLeaveStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "approved" | "rejected";
    }) => hrService.updateLeaveStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "leaves"] });
      queryClient.invalidateQueries({ queryKey: ["hr", "stats"] });
    },
  });
};

export const useRequestLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => hrService.requestLeave(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "leaves"] });
      queryClient.invalidateQueries({ queryKey: ["hr", "stats"] });
    },
  });
};

export const useHRRecruitment = (params?: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["hr", "recruitment", params],
    queryFn: () => hrService.getRecruitment(params),
  });
};

export const useHRPerformance = (params?: {
  month?: number;
  year?: number;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["hr", "performance", params],
    queryFn: () => hrService.getPerformance(params),
  });
};

export const useHRPerformanceDashboard = (params?: {
  month?: number;
  year?: number;
}) => {
  return useQuery({
    queryKey: ["hr", "performance-dashboard", params],
    queryFn: () => hrService.getPerformanceDashboard(params),
  });
};

export const useHRDoctorPerformanceDashboard = (params?: {
  month?: number;
  year?: number;
}) => {
  return useQuery({
    queryKey: ["hr", "doctor-performance-dashboard", params],
    queryFn: () => hrService.getDoctorPerformanceDashboard(params),
  });
};

export const useHRDocuments = (params?: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["hr", "documents", params],
    queryFn: () => hrService.getDocuments(params),
  });
};

export const useHRTraining = (params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ["hr", "training", params],
    queryFn: () => hrService.getTraining(params),
  });
};
export const useSubmitPerformance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => hrService.submitPerformance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "performance"] });
    },
  });
};

export const useUploadHRDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { staffId: string; documentType: string; file: File }) =>
      hrService.uploadDocument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "documents"] });
    },
  });
};

export const useDeleteHRDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      profileId: string;
      documentKey: string;
      role: string;
    }) => hrService.deleteDocument(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "documents"] });
    },
  });
};

// ─── Enterprise Performance Analytics V2 ─────────────────────────────────────

export const usePerformanceDashboardV2 = (params?: { month?: number; year?: number }) => {
  return useQuery({
    queryKey: ["performance", "dashboard", params],
    queryFn: () => performanceService.getDashboard(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const usePerformanceDoctors = (params?: { month?: number; year?: number }) => {
  return useQuery({
    queryKey: ["performance", "doctors", params],
    queryFn: () => performanceService.getDoctors(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const usePerformanceNurses = (params?: { month?: number; year?: number }) => {
  return useQuery({
    queryKey: ["performance", "nurses", params],
    queryFn: () => performanceService.getNurses(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const usePerformanceStaff = (params?: { month?: number; year?: number }) => {
  return useQuery({
    queryKey: ["performance", "staff", params],
    queryFn: () => performanceService.getStaff(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useEmployeeTrends = (employeeId: string | null) => {
  return useQuery({
    queryKey: ["performance", "trends", employeeId],
    queryFn: () => performanceService.getTrends(employeeId!),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
};

export const usePerformanceWeights = () => {
  return useQuery({
    queryKey: ["performance", "weights"],
    queryFn: () => performanceService.getWeights(),
  });
};

export const useUpdatePerformanceWeights = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ role, data }: { role: string; data: any }) =>
      performanceService.updateWeights(role, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance", "weights"] });
      queryClient.invalidateQueries({ queryKey: ["performance", "dashboard"] });
    },
  });
};
