import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { masterHelpdeskService } from "../services/masterHelpdesk.service";

const MASTER_KEY = ["masterhelpdesk"] as const;

export const masterHelpdeskKeys = {
  all: MASTER_KEY,
  dashboard: () => [...MASTER_KEY, "dashboard"] as const,
  queue: (page: number, limit: number, status?: string, hospitalId?: string) => 
    [...MASTER_KEY, "queue", { page, limit, status, hospitalId }] as const,
  transactions: (page: number, limit: number) => 
    [...MASTER_KEY, "transactions", { page, limit }] as const,
  patients: (page: number, limit: number, search?: string) => 
    [...MASTER_KEY, "patients", { page, limit, search }] as const,
};

export const useMasterDashboard = () => {
  return useQuery({
    queryKey: masterHelpdeskKeys.dashboard(),
    queryFn: masterHelpdeskService.getDashboard,
    staleTime: 30 * 1000,
    refetchOnMount: true,
  });
};

export const useMasterQueue = (page: number = 1, limit: number = 20, status?: string, hospitalId?: string) => {
  return useQuery({
    queryKey: masterHelpdeskKeys.queue(page, limit, status, hospitalId),
    queryFn: () => masterHelpdeskService.getQueue(page, limit, status, hospitalId),
    staleTime: 60 * 1000,
  });
};

export const useMasterTransactions = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: masterHelpdeskKeys.transactions(page, limit),
    queryFn: () => masterHelpdeskService.getTransactions(page, limit),
    staleTime: 5 * 60 * 1000,
  });
};

export const useMasterPatients = (page: number = 1, limit: number = 20, search?: string) => {
  return useQuery({
    queryKey: masterHelpdeskKeys.patients(page, limit, search),
    queryFn: () => masterHelpdeskService.getPatients(page, limit, search),
    staleTime: 2 * 60 * 1000,
  });
};
