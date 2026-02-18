import { ReactNode } from 'react';

/**
 * [hospitalId] Layout
 *
 * This layout wraps all tenant-specific portal routes.
 * It provides the hospitalId context to all child components via URL params.
 *
 * The hospitalId is automatically available via useParams() in any child component:
 *   const { hospitalId } = useParams();
 *
 * The apiClient.ts reads this from the URL to inject X-Hospital-Id header.
 */
export default function TenantLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
