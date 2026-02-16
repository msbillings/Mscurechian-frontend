import { QueryClient } from '@tanstack/react-query';

/**
 * Centralized QueryClient configuration for optimal performance
 * 
 * Key Settings:
 * - staleTime: 30000ms (30s) - Data stays fresh for 30 seconds
 * - gcTime: 300000ms (5min) - Cache persists for 5 minutes after unused
 * - retry: 1 - Only retry failed requests once
 * - refetchOnWindowFocus: false - Don't refetch when user returns to tab
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Data is considered fresh for 30 seconds
            staleTime: 30 * 1000, // 30 seconds

            // Cache persists for 5 minutes after component unmounts
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)

            // Only retry once on failure to avoid excessive requests
            retry: 1,

            // Don't refetch when user returns to window
            // (reduces unnecessary API calls)
            refetchOnWindowFocus: false,

            // Don't refetch on mount if data is still fresh
            refetchOnMount: false,

            // Refetch on reconnect to get latest data
            refetchOnReconnect: true,
        },
        mutations: {
            // Only retry mutations once
            retry: 1,
        },
    },
});

/**
 * Query key factory for consistent cache keys
 * This prevents duplicate cache entries and makes invalidation easier
 */
export const queryKeys = {
    // Lab queries
    lab: {
        all: ['lab'] as const,
        samples: (filters?: { status?: string; page?: number; limit?: number }) =>
            ['lab', 'samples', filters] as const,
        sampleById: (id: string) => ['lab', 'samples', id] as const,
        tests: () => ['lab', 'tests'] as const,
        dashboard: () => ['lab', 'dashboard'] as const,
    },

    // Pharmacy queries
    pharmacy: {
        all: ['pharmacy'] as const,
        orders: (filters?: { status?: string; page?: number; limit?: number; hospitalId?: string }) =>
            ['pharmacy', 'orders', filters] as const,
        orderById: (id: string) => ['pharmacy', 'orders', id] as const,
        bills: (filters?: { page?: number; limit?: number; search?: string }) =>
            ['pharmacy', 'bills', filters] as const,
        dashboard: () => ['pharmacy', 'dashboard'] as const,
    },

    // Nurse queries
    nurse: {
        all: ['nurse'] as const,
        patients: (filters?: { page?: number; limit?: number }) =>
            ['nurse', 'patients', filters] as const,
        patientById: (id: string) => ['nurse', 'patients', id] as const,
        tasks: (filters?: { page?: number; limit?: number }) =>
            ['nurse', 'tasks', filters] as const,
        dashboard: () => ['nurse', 'dashboard'] as const,
    },
};
