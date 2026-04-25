import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { masterHelpdeskService } from "../services/masterHelpdesk.service";

const MASTER_KEY = ["masterhelpdesk"] as const;

export const masterHelpdeskKeys = {
  all: MASTER_KEY,
  dashboard: (hospitalId?: string) => [...MASTER_KEY, "dashboard", { hospitalId }] as const,
  queue: (page: number, limit: number, status?: string, hospitalId?: string) => 
    [...MASTER_KEY, "queue", { page, limit, status, hospitalId }] as const,
  transactions: (page: number, limit: number, hospitalId?: string) => 
    [...MASTER_KEY, "transactions", { page, limit, hospitalId }] as const,
  patients: (page: number, limit: number, search?: string, hospitalId?: string) => 
    [...MASTER_KEY, "patients", { page, limit, search, hospitalId }] as const,
};

export const useMasterDashboard = (hospitalId?: string) => {
  return useQuery({
    queryKey: masterHelpdeskKeys.dashboard(hospitalId),
    queryFn: () => masterHelpdeskService.getDashboard(hospitalId),
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

export const useMasterTransactions = (page: number = 1, limit: number = 20, hospitalId?: string) => {
  return useQuery({
    queryKey: masterHelpdeskKeys.transactions(page, limit, hospitalId),
    queryFn: () => masterHelpdeskService.getTransactions(page, limit, hospitalId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useMasterPatients = (page: number = 1, limit: number = 20, search?: string, hospitalId?: string) => {
  return useQuery({
    queryKey: masterHelpdeskKeys.patients(page, limit, search, hospitalId),
    queryFn: () => masterHelpdeskService.getPatients(page, limit, search, hospitalId),
    staleTime: 2 * 60 * 1000,
  });
};
