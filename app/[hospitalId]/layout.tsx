'use client';

import { ReactNode } from 'react';
import { useTenantContext } from '@/hooks/useTenantContext';

/**
 * [hospitalId] Tenant Layout
 * 
 * This layout wraps all tenant-specific portal routes.
 * It uses useTenantContext to ensure the activeHospitalId is synced
 * to sessionStorage for the apiClient to pick up.
 */
export default function TenantLayout({ children }: { children: ReactNode }) {
  // ✅ SYNC: This hook ensures hospitalId from URL is synced to sessionStorage
  useTenantContext();
  
  return <>{children}</>;
}
