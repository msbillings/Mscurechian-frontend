# API Integration Structure

This document outlines the centralized API integration approach used in the CureChain frontend application. Our architecture separates server-side data fetching (Actions) from client-side interactions (Services), ensuring optimal performance and type safety.

## Directory Structure

```
lib/integrations/
├── config/
│   ├── index.ts          # Central configuration export
│   ├── endpoints.ts      # API endpoint constants (AUTH, ADMIN, USER)
│   └── api-config.ts     # Base URL and environment variables
├── types/
│   ├── index.ts          # Type exports
│   ├── api.ts            # Generic API result/request types
│   ├── auth.ts           # Auth-related interfaces
│   ├── admin.ts          # Admin & Infrastructure interfaces
│   └── user.ts           # User & Profile interfaces
├── api/
│   ├── apiClient.ts      # Client-side fetcher (for hooks/client components)
│   └── apiServer.ts      # Server-side fetcher (for actions/server components)
├── actions/              # Server Actions (Entry points for Server Components)
│   ├── index.ts          # Action exports
│   ├── admin.actions.ts  # Admin data fetching actions
│   ├── auth.actions.ts   # Authentication flow actions
│   └── user.actions.ts   # User profile actions
├── services/             # Client-side Services (Entry points for Client Components)
│   ├── index.ts          # Service exports
│   ├── admin.service.ts  # Infrastructure monitoring services
│   ├── auth.service.ts   # Auth state services
│   └── user.service.ts   # User profile services
└── index.ts              # Unified entry point for the library
```

## Key Layers

### 1. Config Layer (`config/`)

All API routes are defined as constants. Avoid hardcoding URLs in components. Use dynamic functions for nested routes (e.g., `DELETE_HOSPITAL: (id) => ...`).

### 2. API Clients (`api/`)

- **`apiServer.ts`**: Uses `node-fetch` or native `fetch`. Automatically handles session cookies for server-side requests. Used exclusively in **Server Actions**.
- **`apiClient.ts`**: Standard browser-safe fetcher. Handles client-side headers and interceptors. Used in **Services**.

### 3. Actions Layer (`actions/`) - "The Workhorses"

Server Actions are the preferred way to fetch data for Server Components. They serve as a bridge between the frontend and the backend API while keeping secrets and cookies on the server.

- File must start with `"use server"`.
- Wraps `apiServer` calls.
- Used in `async` Server Components.

### 4. Services Layer (`services/`)

Services are used primarily in Client Components for interactivity (e.g., toggling a status, deleting a record via button click).

- Uses `apiClient`.
- Ideal for usage with `useEffect` or button event handlers.

---

## Usage Examples

### 1. Server Components (Data Fetching via Actions)

Always prefer fetching initial page data on the server for speed and SEO.

```tsx
// app/admin/hospitals/page.tsx
import { getHospitalsAction } from "@/lib/integrations";

export default async function HospitalsPage() {
  // Action executes on the server
  const hospitals = await getHospitalsAction();

  return (
    <main>
      {hospitals.map((h) => (
        <HospitalCard key={h._id} data={h} />
      ))}
    </main>
  );
}
```

### 2. Server Actions (Form Mutations)

Use `revalidatePath` to refresh the cache after a successful mutation.

```tsx
// lib/integrations/actions/admin.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { apiServer } from "../api/apiServer";

export async function createHospitalAction(formData: any) {
  try {
    const result = await apiServer("/admin/create-hospital", {
      method: "POST",
      body: JSON.stringify(formData),
    });

    revalidatePath("/admin/hospitals"); // Refresh the list
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to create node" };
  }
}
```

### 3. Client Components (Interactivity via Services)

Use Services for actions that happen after the page has loaded.

```tsx
// components/admin/DeleteButton.tsx
"use client";

import { adminService } from "@/lib/integrations";
import toast from "react-hot-toast";

export function DeleteButton({ id }) {
  const handleDelete = async () => {
    try {
      await adminService.deleteHospitalClient(id);
      toast.success("Node removed from network");
      window.location.reload(); // Or use router.refresh()
    } catch (err) {
      toast.error("Decommission failed");
    }
  };

  return <button onClick={handleDelete}>Remove Node</button>;
}
```

---

## Best Practices

1. **Server First**: If a component doesn't need `useState` or `useEffect`, make it a Server Component and use an Action to get data.
2. **Type Safety**: Always pass the generic type to the client/server calls: `apiServer<Hospital[]>(...)`.
3. **Revalidation**: Always use `revalidatePath` or `revalidateTag` in Actions that modify data to keep the UI in sync.
4. **Error Handling**:
   - Actions should return an object `{ success: boolean, data?: T, error?: string }`.
   - Services should throw errors that can be caught by the UI's `try/catch`.
5. **Unified Exports**: Always export new actions/services through their respective `index.ts` and finally through `lib/integrations/index.ts`.

## Extending the Library

1. **Endpoints**: Add the new URL to `config/endpoints.ts`.
2. **Types**: Define the interface in `types/`.
3. **Action**: If needed for initial page load, add it to `actions/`.
4. **Service**: If needed for client interactivity, add it to `services/`.
5. **Export**: Export from the respective index files.
