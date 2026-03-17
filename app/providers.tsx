'use client';

import React, { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useEffect } from 'react';
import { clearLegacyAuthData } from '@/lib/utils/auth-cleanup';
import { useAuthStore } from '@/stores/authStore';

function Providers({ children }: { children: ReactNode }) {
  // ✅ MULTI-TAB AUTH: Only bootstrap session if THIS tab has explicitly logged in.
  // New tabs must always enter fresh credentials — they don't inherit cookies automatically.
  useEffect(() => {
    // Ensure axios sends cookies
    import('axios').then(({ default: axios }) => {
      axios.defaults.withCredentials = true;
    }).catch(() => {});

    const { initializeAuth, initEvents } = useAuthStore.getState();
    initEvents();

    // ✅ TAB ISOLATION: Only restore session for tabs that have been explicitly authorized.
    // sessionStorage is tab-isolated: new tabs never inherit it from an existing tab.
    const isTabAuthorized = typeof window !== 'undefined' && !!sessionStorage.getItem('tabAuthorized');
    if (isTabAuthorized) {
      initializeAuth();
    } else {
      // Mark this new tab as initialized but NOT authenticated
      // so protected routes redirect to login immediately
      useAuthStore.setState({ isInitialized: true, isAuthenticated: false, isLoading: false });
    }
    
    clearLegacyAuthData();
  }, []);

  // ⚡ SUPER-FAST PERFORMANCE: Cache-first strategy for instant navigation (<1.5s)
  // Individual hooks override these defaults when real-time updates are needed
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // ⚡ 5min - Data stays fresh, reduces refetches
        gcTime: 15 * 60 * 1000,   // ⚡ 15min - Keep data in memory for instant access
        refetchOnWindowFocus: false, // ⚡ DISABLED - Prevents unnecessary refetches on tab switch
        refetchOnMount: false,       // ⚡ DISABLED - Use cached data instantly, no mount refetch
        refetchOnReconnect: false,   // ⚡ DISABLED - Prevents refetch storms on reconnect
        retry: 1, // Only 1 retry for failed requests
        networkMode: 'online',
      },
    },
  }), []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export default React.memo(Providers);
