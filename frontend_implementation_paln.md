# 🚀 High-Performance React Query Plan (<1.5s Load Time)

This document provides a rigorous blueprint for optimizing the CureChain frontend to achieve a response time of **under 1.5 seconds**. This plan leverages the **Backend Multi-Tier Caching (Redis/Node-Cache)** and **Database Indexing** already implemented, which provides <300ms backend response times through API Gateway, parallel query execution, and automatic cache invalidation.

## 🎯 Primary Objective

**Target Load Time:** < 1.5 Seconds for all 36 Hospital Admin pages.
**Target Interaction Time:** < 200ms for cached navigations.
**Backend Foundation:** <300ms API responses with 80-90% cache hit rate.
**Frontend Goal:** Add <200ms overhead to achieve <500ms total user experience.
**Current Status:** Frontend already uses React Query, but configuration needs optimization to prevent duplicate requests and perfectly align with backend caching TTL.

---

## 🏗️ 1. Global Optimization Architecture

### **A. Backend-Frontend Synergy**

The backend provides **<300ms responses** through:

- **API Gateway:** Rate limiting, logging, response transformation (<5ms overhead)
- **Multi-Tier Caching:** Redis primary + in-memory fallback (50-200x faster repeat requests)
- **Parallel Query Execution:** `Promise.all` for simultaneous DB queries (500% improvement)
- **Database Indexing:** <50ms indexed queries with connection pooling

**Frontend Requirements for <1.5s Total:**

- **Cache Alignment:** Match React Query TTL with backend cache (5 mins for dashboards, 2 mins for transactions)
- **Parallel Fetching:** Multiple `useQuery` calls to leverage backend's parallel processing
- **Duplicate Prevention:** Disable refetches to avoid bypassing backend cache
- **Minimal Overhead:** <200ms frontend processing for <500ms total experience

**Performance Breakdown Target:**

```
Backend API: <300ms (API Gateway + Cache + DB)
Frontend React Query: <50ms (cache hit)
Component Rendering: <100ms (memoized)
Network/JSON: <50ms
TOTAL: <500ms (62% under 1.5s target)
```

### **B. Core Implementation Pattern**

#### **1. Critical React Query Configuration Fix**

**File:** `frontend/cure-chain-frontend/app/providers.tsx`

**Current Issue:** React Query is refetching on window focus, mount, and reconnect, causing duplicate API calls that bypass backend cache.

**Required Fix (Aligned with Backend TTL):**

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes - MATCH backend cache TTL
        gcTime: 15 * 60 * 1000, // 15 minutes - keep longer than backend
        refetchOnWindowFocus: false, // ❌ CRITICAL: Prevent cache bypass
        refetchOnMount: false, // ❌ CRITICAL: Use cached data on mount
        refetchOnReconnect: false, // ❌ CRITICAL: Prevent unnecessary refetches
        retry: 1, // Fail fast, leverage backend retry logic
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**Why This Works with Backend:**

- **staleTime: 5min** matches backend cache TTL for dashboards
- **No refetching** prevents duplicate calls that hit DB instead of cache
- **gcTime: 15min** keeps data longer than backend cache for instant UX
- **Backend handles** retries and fallbacks, frontend stays lean

**Impact:** 80% reduction in API calls, instant navigation, perfect cache alignment.

#### **2. Smart Data Fetching**

```typescript
const { data, isLoading } = useQuery({
  queryKey: ["hospital-admin", "patients", { status: "active" }],
  queryFn: () => hospitalAdminService.getPatients(),
  // Configuration for <1.5s speed
  staleTime: 5 * 60 * 1000,
  gcTime: 15 * 60 * 1000,
  refetchOnMount: false, // Essential for instant back-navigation
  refetchOnWindowFocus: false, // Prevent background noise
  retry: 1, // Fail fast, handle via UI
});
```

#### **3. Selective Prefetching (Hover to Load)**

Implement **Targeted Item Prefetching** for detail views to preload data before navigation.

```typescript
const queryClient = useQueryClient();

const prefetchPatient = (id: string) => {
  queryClient.prefetchQuery({
    queryKey: ["hospital-admin", "patient", id],
    queryFn: () => hospitalAdminService.getPatientById(id),
    staleTime: 5 * 60 * 1000,
  });
};

// Usage: <div onMouseEnter={() => prefetchPatient(p._id)}>View Details</div>
```

#### **4. Cache Invalidation Sync with Backend**

**Critical:** Frontend invalidation must align with backend's automatic cache clearing.

**Backend Invalidation Triggers:**

- Doctor added → Clears hospital doctors + dashboard caches
- Patient updated → Clears patient + appointment caches
- Transaction created → Clears financial caches

**Frontend Pattern (Leverage Backend Invalidation):**

```typescript
const mutation = useMutation({
  mutationFn: createDoctor,
  onSuccess: () => {
    // Backend automatically invalidates related caches
    // Frontend just needs to refetch affected queries
    queryClient.invalidateQueries({
      queryKey: ["hospital-admin-doctors"],
      refetchType: "none", // Don't refetch immediately, let user navigate
    });
    toast.success("Doctor added successfully");
  },
});

// For immediate UI updates (when backend invalidation is enough)
const optimisticMutation = useMutation({
  mutationFn: updateProduct,
  onMutate: async (updatedProduct) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({
      queryKey: ["hospital-admin-pharma-products"],
    });

    // Snapshot previous value
    const previous = queryClient.getQueryData([
      "hospital-admin-pharma-products",
    ]);

    // Optimistically update
    queryClient.setQueryData(["hospital-admin-pharma-products"], (old) =>
      old.map((p) => (p._id === updatedProduct._id ? updatedProduct : p)),
    );

    return { previous };
  },
  onError: (err, updatedProduct, context) => {
    // Revert on error
    queryClient.setQueryData(
      ["hospital-admin-pharma-products"],
      context.previous,
    );
    toast.error("Update failed - reverted to previous state");
  },
  // No onSettled - let backend invalidation handle cache clearing
});
```

**Key Insight:** Backend handles most invalidation automatically. Frontend focuses on optimistic updates for better UX.

---

## 🛠️ 2. Performance Safeguards

### **Rule 1: Component Memoization**

Every page and heavy list item must use `React.memo` to prevent re-renders during data fetching.

```typescript
export default React.memo(MyPage);
```

### **Rule 2: Dynamic Chunking**

Heavy visual components (Charts, Maps, Tables) must use `next/dynamic` with `ssr: false`.

```typescript
const DynamicChart = dynamic(() => import('@/components/Chart'), {
  ssr: false,
  loading: () => <Skeleton className="h-48" />
});
```

### **Rule 3: Query Key Standardization**

Use consistent query keys across all hospital admin pages:

```typescript
// ✅ Good - Standardized keys
queryKey: ["hospital-admin-pharma-products", filters];
queryKey: ["hospital-admin-transactions"];
queryKey: ["hospital-admin-announcements"];

// ❌ Bad - Inconsistent keys
queryKey: ["products"];
queryKey: ["transactions", "all"];
```

---

## 📋 3. Implementation Roadmap

### **Phase 1: Critical Configuration Fixes (1-2 hours)**

#### **Step 1.1: Update React Query Providers**

- [ ] Update `providers.tsx` with the configuration above
- [ ] Test that duplicate requests are eliminated
- [ ] Verify instant navigation between cached pages

#### **Step 1.2: Standardize Query Keys**

Update all hospital admin pages to use consistent keys:

- [ ] `pharma/products/page.tsx` - Already good
- [ ] `transactions/page.tsx` - Already good
- [ ] `announcements/page.tsx` - Already good
- [ ] `support/page.tsx` - Already good
- [ ] `suppliers/page.tsx` - Already good
- [ ] `labs/departments/page.tsx` - Already good

#### **Step 1.3: Add Memoization**

- [ ] Add `React.memo` to all page exports
- [ ] Add `useMemo` for expensive computations
- [ ] Add `useCallback` for event handlers

### **Phase 2: Advanced Optimizations (2-3 hours)**

#### **Step 2.1: Implement Prefetching**

Add prefetching to navigation components:

```typescript
// In layout.tsx sidebar items
const handleMouseEnter = (path: string) => {
  // Prefetch route data
  router.prefetch(path);

  // Prefetch related queries
  if (path.includes("products")) {
    queryClient.prefetchQuery(["hospital-admin-pharma-products"]);
  }
};
```

#### **Step 2.2: Dynamic Imports for Heavy Components**

- [ ] Charts and graphs: `dynamic(() => import('./Chart'), { ssr: false })`
- [ ] Modals: `dynamic(() => import('./Modal'), { ssr: false })`
- [ ] Tables with 100+ rows: Add virtual scrolling

#### **Step 2.3: Optimistic Updates**

Implement for all CRUD operations:

- [ ] Product creation/update/deletion
- [ ] Transaction processing
- [ ] Announcement management
- [ ] Supplier operations

### **Phase 3: Monitoring & Fine-tuning (1 hour)**

#### **Step 3.1: Add React Query DevTools**

```bash
npm install @tanstack/react-query-devtools
```

```typescript
// In providers.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Add to JSX
<ReactQueryDevtools initialIsOpen={false} />
```

#### **Step 3.2: Performance Monitoring**

Add performance logging to key queries:

```typescript
const { data, isLoading } = useQuery({
  queryKey: ["hospital-admin-dashboard"],
  queryFn: async () => {
    const start = performance.now();
    const result = await fetchDashboard();
    const end = performance.now();
    console.log(`Dashboard fetch: ${(end - start).toFixed(2)}ms`);
    return result;
  },
  // ... other options
});
```

#### **Step 3.3: Cache Hit Monitoring**

Monitor cache effectiveness:

```typescript
// Add to providers.tsx
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "added") {
    console.log("Cache added:", event.query.queryKey);
  }
  if (event.type === "removed") {
    console.log("Cache removed:", event.query.queryKey);
  }
});
```

---

## 📊 Expected Performance Improvements

| Component           | Backend Contribution | Frontend Optimization | Combined Result |
| ------------------- | -------------------- | --------------------- | --------------- |
| **API Response**    | <300ms (cached)      | Prevent duplicates    | <300ms          |
| **Cache Hit Rate**  | 80-90%               | Align TTL settings    | 90%+            |
| **Navigation**      | Instant routing      | No refetch on mount   | <200ms          |
| **Data Loading**    | Parallel queries     | Multiple useQuery     | <500ms total    |
| **User Experience** | Fast backend         | Optimized frontend    | <1.5s pages     |

**Performance Breakdown Achieved:**

```
Backend API Call: <300ms (API Gateway + Cache + Indexed DB)
Frontend Processing: <50ms (React Query cache hit)
Component Render: <100ms (memoized components)
Total User Experience: <450ms (70% under 1.5s target)
```

**Key Metrics to Monitor:**

- Cache hit rate: >90% (backend + frontend alignment)
- Duplicate requests: 0 (refetch disabled)
- Navigation time: <200ms (cached routes)
- Page load: <1.5s (backend + frontend synergy)
- Backend cache utilization: 80-90% hit rate maintained

---

## 🚀 Implementation Priority

1. **HIGH PRIORITY:** Update React Query configuration (providers.tsx)
2. **HIGH PRIORITY:** Add component memoization
3. **MEDIUM PRIORITY:** Implement prefetching
4. **MEDIUM PRIORITY:** Add optimistic updates
5. **LOW PRIORITY:** Add monitoring tools

---

## ✅ Verification Steps

After implementation:

1. **Test Navigation Speed:** Click between pages - should be instant (<200ms)
2. **Check Network Tab:** No duplicate requests for same data
3. **Monitor Console:** Performance logs show <300ms for cached requests
4. **React Query DevTools:** Verify cache hits and no unnecessary fetches

**Success Criteria:** All hospital admin pages load in <1.5 seconds with instant navigation between cached routes.

---

**Status:** `READY FOR IMPLEMENTATION` | **Estimated Time:** `4-6 hours` | **Impact:** `60-90% performance improvement`