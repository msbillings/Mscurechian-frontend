'use client';

import React, { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

function Providers({ children }: { children: ReactNode }) {
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
