'use client';

import { useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';

/**
 * Tenant-Aware Portal Redirect
 *
 * This page handles routes like /{hospitalId}/doctor/...
 * It:
 * 1. Extracts the hospitalId from the URL
 * 2. Stores it in sessionStorage for the apiClient
 * 3. Renders the existing portal content (via the existing app/doctor/ routes)
 *
 * Strategy: We use Next.js rewrites in next.config.ts to map
 * /{hospitalId}/doctor/* → /doctor/* while keeping hospitalId in the URL.
 */
export default function TenantPortalRedirect() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const hospitalId = params?.hospitalId as string;

  useEffect(() => {
    if (hospitalId && typeof window !== 'undefined') {
      // Store hospitalId for apiClient
      sessionStorage.setItem('activeHospitalId', hospitalId);
    }
  }, [hospitalId]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
    </div>
  );
}
