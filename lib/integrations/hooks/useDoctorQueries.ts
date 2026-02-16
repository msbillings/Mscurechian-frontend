import { useQuery } from '@tanstack/react-query';
import { getDoctorInpatientsAction } from '../actions/doctor.actions';

export const useDoctorInpatients = (userId?: string, role?: string) => {
    return useQuery({
        queryKey: ['doctor-inpatients', userId],
        queryFn: async () => {
            const res = await getDoctorInpatientsAction(userId);
            if (res.success) return res.data || [];
            throw new Error(res.error || 'Failed to fetch inpatients');
        },
        enabled: !!userId, // strictly ID based
        staleTime: 0, // No stale time - always fetch fresh
        refetchInterval: 10000, // 10s auto-refresh for reactive UI
        refetchOnWindowFocus: true
    });
};
