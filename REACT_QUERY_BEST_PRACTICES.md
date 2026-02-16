# React Query Best Practices - CureChain

## 🚨 CRITICAL: Query Key Guidelines

**WHY THIS MATTERS:**
Improper query keys are THE #1 cause of over-fetching and performance issues in React Query apps.

---

## ✅ **CORRECT: Use Primitive Values ONLY**

```tsx
// ✅ GOOD - uses primitives (strings, numbers, booleans)
const { data } = useQuery({
  queryKey: ["transactions", hospitalId, page, limit], // primitives only
  queryFn: () => fetchTransactions(hospitalId, page, limit),
});

// ✅ GOOD - stable object with primitive values
const filters = useMemo(
  () => ({
    status: "paid",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
  }),
  [],
); // Empty deps = stable reference

const { data } = useQuery({
  queryKey: ["transactions", filters],
  queryFn: () => fetchTransactions(filters),
});
```

---

## ❌ **WRONG: Using Objects Directly**

```tsx
// ❌ BAD - unstable object reference
const { data } = useQuery({
  queryKey: ["transactions", hospital], // hospital is an object
  queryFn: () => fetchTransactions(hospital),
});
// Problem: Every render creates new hospital object → refetch storm

// ❌ BAD - object from Zustand/Context
const user = useAuthStore((state) => state.user); // entire object
const { data } = useQuery({
  queryKey: ["user-data", user], // user object changes reference
  queryFn: () => fetchUserData(user),
});
// Problem: user object reference changes → unnecessary refetches
```

---

## 🎯 **RULE 1: Extract Primitives from Objects**

```tsx
// ❌ BEFORE (causes refetches)
const user = useAuthStore();
const { data } = useQuery({
  queryKey: ["user-appointments", user],
  queryFn: () => api.getAppointments(user.id),
});

// ✅ AFTER (prevents refetches)
const userId = useAuthStore((state) => state.user?.id); // primitive only
const { data } = useQuery({
  queryKey: ["user-appointments", userId],
  queryFn: () => api.getAppointments(userId),
});
```

---

## 🎯 **RULE 2: Use Stable References for Complex Filters**

```tsx
// ❌ BEFORE (refetches every render)
const { data } = useQuery({
  queryKey: ["staff", { department, status, page }], // new object every render
  queryFn: () => api.getStaff({ department, status, page }),
});

// ✅ AFTER (refetches only when values change)
const { data } = useQuery({
  queryKey: ["staff", department, status, page], // primitives
  queryFn: () => api.getStaff({ department, status, page }),
});
```

---

## 🎯 **RULE 3: Zustand Selectors Must Return Primitives**

```tsx
// ❌ BAD - subscribes to entire user object
const user = useAuthStore((state) => state.user);
const userName = user?.name;
const userRole = user?.role;

// ✅ GOOD - subscribes to primitives only
const userName = useAuthStore((state) => state.user?.name);
const userRole = useAuthStore((state) => state.user?.role);
const userId = useAuthStore((state) => state.user?.id);
```

**Why?** Each time Zustand's `user` object changes (even if `name` stays the same),
components re-render. Primitive selectors prevent this.

---

## 🎯 **RULE 4: Page Components Own Their Data**

```tsx
// ✅ Each page fetches ONLY its own data
const TransactionsPage = () => {
  const { data: transactions } = useQuery({
    queryKey: ["transactions", page, limit],
    queryFn: () => api.getTransactions(page, limit),
  });

  // ❌ DON'T fetch unrelated data
  // const { data: doctors } = useQuery(...);  // belongs in DoctorsPage

  return <div>{/* render transactions */}</div>;
};
```

---

## 🎯 **RULE 5: Layout Should NOT Fetch Data**

```tsx
// ❌ BAD - layout fetches shared data
const Layout = ({ children }) => {
  const { data: permissions } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => api.getPermissions(),
  });

  return <div>{children}</div>;
};

// ✅ GOOD - layout is a pure shell
const Layout = ({ children }) => {
  const userName = useAuthStore((state) => state.user?.name);
  const userRole = useAuthStore((state) => state.user?.role);

  // No queries here - just layout structure
  return <div>{children}</div>;
};
```

---

## 📊 **Testing Your Query Keys**

Run this in your page component:

```tsx
useEffect(() => {
  console.log("Query key:", queryKey);
}, [queryKey]);
```

**Expected output** (on every navigation):

```
Query key: ['transactions', '123', 1, 10]  // Same array = no refetch ✅
```

**Bad output** (indicates problem):

```
Query key: ['transactions', { hospitalId: '123', ... }]  // Different object = refetch ❌
```

---

## 🚀 **Performance Checklist**

Before deploying any page with React Query:

- [ ] All query keys use **primitives only** (string, number, boolean)
- [ ] Zustand selectors return **primitives** not objects
- [ ] Layout subscribes to **primitives** only
- [ ] Each page fetches **only its own data**
- [ ] No global data fetched on route change
- [ ] Query keys logged in console show **same reference** on re-render

---

## 🔥 **Common Pitfalls**

1. **Using `useAuthStore()` without selector**

   ```tsx
   // ❌ BAD
   const { user } = useAuthStore();

   // ✅ GOOD
   const userId = useAuthStore((state) => state.user?.id);
   ```

2. **Inline objects in query keys**

   ```tsx
   // ❌ BAD
   queryKey: ["data", { id, status }];

   // ✅ GOOD
   queryKey: ["data", id, status];
   ```

3. **Layout depends on user object**

   ```tsx
   // ❌ BAD
   const { user } = useAuthStore();
   return <div>{user.name}</div>;

   // ✅ GOOD
   const userName = useAuthStore((state) => state.user?.name);
   return <div>{userName}</div>;
   ```

---

## 📚 **Further Reading**

- [React Query Query Keys](https://tanstack.com/query/latest/docs/react/guides/query-keys)
- [Zustand Performance](https://docs.pmnd.rs/zustand/guides/performance)

---

**Last Updated:** 2026-01-27
**Applies To:** All hospital-admin dashboard pages and future features
