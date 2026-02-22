'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useTenantLink } from '@/hooks/useTenantLink';

/**
 * Tenant-Aware Portal Home Redirect
 *
 * This page handles routes like /{hospitalId}/
 * It:
 * 1. Extracts the hospitalId from the URL
 * 2. Stores it in sessionStorage for the apiClient
 * 3. Redirects the user to their respective portal (doctor, nurse, etc.)
 */
export default function TenantPortalRedirect() {
  const params = useParams();
  const router = useRouter();
  const hospitalId = params?.hospitalId as string;
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const { getPath } = useTenantLink();

  useEffect(() => {
    if (hospitalId && typeof window !== 'undefined') {
      // Store hospitalId for apiClient
      sessionStorage.setItem('activeHospitalId', hospitalId);
    }
  }, [hospitalId]);

  useEffect(() => {
    if (isInitialized && isAuthenticated && user) {
      const role = user.role;
      const portalMap: Record<string, string> = {
        'doctor': '/doctor',
        'hospital-admin': '/hospital-admin',
        'helpdesk': '/helpdesk',
        'nurse': '/nurse',
        'lab': '/lab/dashboard',
        'pharmacy': '/pharmacy/dashboard',
        'patient': '/patient',
        'staff': '/staff',
        'hr': '/hr',
      };

      const targetPath = portalMap[role] || '/auth/login';
      router.replace(getPath(targetPath));
    } else if (isInitialized && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isInitialized, isAuthenticated, user, router, getPath]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Initializing Tenant Context...
        </p>
      </div>
    </div>
  );
}
