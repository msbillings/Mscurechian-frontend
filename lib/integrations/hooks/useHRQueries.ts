import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hrService } from "../services/hr.service";

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
  page?: number;
  limit?: number;
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
  period?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["hr", "performance", params],
    queryFn: () => hrService.getPerformance(params),
  });
};

export const useHRDocuments = (params?: {
  category?: string;
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
