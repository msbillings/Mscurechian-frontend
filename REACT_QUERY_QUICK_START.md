# 🚀 Quick Start Guide - React Query Optimization

## For Developers: How to Use the New Optimized Hooks

### 📦 Available Hooks

#### **Helpdesk Hooks**
```typescript
import {
  useHelpdeskDashboard,      // Dashboard data
  useHelpdeskDoctors,         // All doctors
  usePatientSearch,           // Search patients
  usePatientDetails,          // Single patient
  useAppointments,            // Appointments list
  useCreateAppointment,       // Create appointment
  useUpdateAppointmentStatus, // Update appointment
  useDoctorAvailability,      // Doctor availability
  useTransactions,            // Payments/transactions
  useTransits,                // Clinical transits
} from '@/lib/integrations/hooks';
```

#### **Staff Hooks**
```typescript
import {
  useStaffDashboard,       // Dashboard data
  useStaffProfile,         // Staff profile
  useAttendance,           // Attendance records
  useAttendanceHistory,    // Paginated history
  useTodayStatus,          // Today's check-in status
  useCheckIn,              // Check-in mutation
  useCheckOut,             // Check-out mutation
  useLeaves,               // Leave requests
  useCreateLeave,          // Create leave
  useSchedule,             // Work schedule
  usePayroll,              // Payroll info
  useAnnouncements,        // Announcements
} from '@/lib/integrations/hooks';
```

---

## 🎯 Basic Usage Patterns

### **1. Fetching Data (Query)**
```typescript
'use client';
import { useHelpdeskDashboard } from '@/lib/integrations/hooks';
import { HelpdeskDashboardSkeleton } from '@/components/ui/skeletons';

function MyComponent() {
  const { data, isLoading, error, refetch } = useHelpdeskDashboard();
  
  if (isLoading) return <HelpdeskDashboardSkeleton />;
  if (error) return <div>Error loading data</div>;
  
  return (
    <div>
      <h1>Total Patients: {data.stats.totalPatients}</h1>
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

### **2. Creating/Updating Data (Mutation)**
```typescript
'use client';
import { useUpdateAppointmentStatus } from '@/lib/integrations/hooks';
import toast from 'react-hot-toast';

function AppointmentActions({ appointmentId }) {
  const updateStatus = useUpdateAppointmentStatus();
  
  const handleConfirm = async () => {
    try {
      await updateStatus.mutateAsync({
        appointmentId,
        status: 'confirmed'
      });
      toast.success('Appointment confirmed!');
    } catch (error) {
      toast.error('Failed to update');
    }
  };
  
  return (
    <button
      onClick={handleConfirm}
      disabled={updateStatus.isPending}
    >
      {updateStatus.isPending ? 'Updating...' : 'Confirm Appointment'}
    </button>
  );
}
```

### **3. Paginated Data**
```typescript
'use client';
import { useState } from 'react';
import { usePatientSearch } from '@/lib/integrations/hooks';

function PatientSearch() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = usePatientSearch(query, page, 10);
  
  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search patients..."
      />
      {isLoading ? (
        <div>Searching...</div>
      ) : (
        <div>
          {data?.patients.map(patient => (
            <div key={patient._id}>{patient.name}</div>
          ))}
        </div>
      )}
      <button onClick={() => setPage(p => p + 1)}>Next Page</button>
    </div>
  );
}
```

---

## 🎨 With Skeletons (Recommended)

### **Helpdesk Dashboard**
```typescript
'use client';
import { useHelpdeskDashboard, useHelpdeskDoctors } from '@/lib/integrations/hooks';
import { HelpdeskDashboardSkeleton } from '@/components/ui/skeletons';

function HelpdeskPage() {
  const { data: dashboard, isLoading: loadingDash } = useHelpdeskDashboard();
  const { data: doctors, isLoading: loadingDocs } = useHelpdeskDoctors();
  
  // Show skeleton while ANY data is still loading
  if (loadingDash || loadingDocs) {
    return <HelpdeskDashboardSkeleton />;
  }
  
  return (
    <div>
      {/* Your dashboard UI */}
    </div>
  );
}
```

### **Staff Dashboard**
```typescript
'use client';
import { useStaffDashboard, useAttendanceHistory } from '@/lib/integrations/hooks';
import { StaffDashboardSkeleton } from '@/components/ui/skeletons';

function StaffPage() {
  const { data: dashboard, isLoading } = useStaffDashboard();
  const { data: history } = useAttendanceHistory({ limit: 5, page: 1 });
  
  if (isLoading) return <StaffDashboardSkeleton />;
  
  return (
    <div>
      {/* Your staff dashboard UI */}
    </div>
  );
}
```

---

## ⚡ Performance Tips

### **1. Use useMemo for Computed Values**
```typescript
import { useMemo } from 'react';

const doctorQueues = useMemo(() => {
  // Expensive computation
  return computeDoctorQueues(doctors, appointments);
}, [doctors, appointments]);
```

### **2. Use useCallback for Event Handlers**
```typescript
import { useCallback } from 'react';

const handleRefresh = useCallback(() => {
  refetch();
}, [refetch]);
```

### **3. Conditional Fetching**
```typescript
const { data } = usePatientDetails(
  patientId,
  enabled // Only fetch if enabled is true
);
```

---

## 🔄 Cache Invalidation

### **Automatic (Built-in)**
All mutations automatically invalidate related caches:

```typescript
const updateStatus = useUpdateAppointmentStatus();

// When mutation succeeds, these are automatically refreshed:
// - helpdeskKeys.appointments()
// - helpdeskKeys.dashboard()
```

### **Manual (If Needed)**
```typescript
import { useQueryClient } from '@tanstack/react-query';
import { helpdeskKeys } from '@/lib/integrations/hooks';

function MyComponent() {
  const queryClient = useQueryClient();
  
  const handleCustomAction = () => {
    // Manually invalidate specific cache
    queryClient.invalidateQueries({
      queryKey: helpdeskKeys.dashboard()
    });
  };
}
```

---

## 🛠️ Debugging

### **1. Check React Query DevTools (Optional)**
```bash
npm install @tanstack/react-query-devtools
```

```typescript
// app/providers.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClientRef.current!}>
  {children}
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### **2. Log Query State**
```typescript
const query = useHelpdeskDashboard();

console.log({
  data: query.data,
  isLoading: query.isLoading,
  isFetching: query.isFetching,
  isError: query.isError,
  error: query.error,
});
```

---

## ❌ Common Mistakes to Avoid

### **1. DON'T use useState for server data**
```typescript
// ❌ BAD
const [data, setData] = useState(null);
useEffect(() => {
  helpdeskService.getDashboard().then(setData);
}, []);

// ✅ GOOD
const { data } = useHelpdeskDashboard();
```

### **2. DON'T manually refetch after mutations**
```typescript
// ❌ BAD
const updateStatus = useUpdateAppointmentStatus();
await updateStatus.mutateAsync(...);
refetchDashboard(); // Unnecessary!

// ✅ GOOD (automatic)
const updateStatus = useUpdateAppointmentStatus();
await updateStatus.mutateAsync(...);
// Dashboard automatically refetches
```

### **3. DON'T use loading state for mutations**
```typescript
// ❌ BAD
const [loading, setLoading] = useState(false);
const mutation = useCheckIn();

// ✅ GOOD
const mutation = useCheckIn();
// Use mutation.isPending directly
{mutation.isPending && <Spinner />}
```

---

## 📋 Checklist for New Pages

When creating a new dashboard/page:

- [ ] Identify required data sources
- [ ] Use appropriate query hooks (not manual fetch)
- [ ] Create skeleton component matching layout
- [ ] Show skeleton while `isLoading`
- [ ] Use `useMemo` for computed values
- [ ] Use `useCallback` for handlers
- [ ] Use mutations for data changes (not manual API calls)
- [ ] Check mutation states with `isPending`
- [ ] Let React Query handle cache invalidation

---

## 🎯 Performance Goals

Every page should meet these targets:

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| UI Visible | <300ms | Use skeletons |
| Data Loaded | <800ms | Use React Query cache |
| Fully Interactive | <1.1s | Optimize re-renders |

---

## 📚 Additional Resources

- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
- [Cache Invalidation Guide](https://tanstack.com/query/latest/docs/react/guides/query-invalidation)

---

**Questions?** Check the implementation in:
- `app/helpdesk/page.tsx` - Full example
- `app/staff/page.tsx` - Full example
- `lib/integrations/hooks/useHelpdeskQueries.ts` - All hooks
