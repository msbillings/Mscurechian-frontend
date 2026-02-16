import { API_CONFIG } from '../config';
import { cookies } from 'next/headers';

export async function apiServer<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  const fullUrl = `${API_CONFIG.BASE_URL}${path}`;
  console.log(`[apiServer] Request: ${path}`);

  const isFormData = options?.body instanceof FormData;

  const headers: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options?.headers,
  };

  if (accessToken) {
    (headers as any)['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    ...options,
    headers,
    cache: options?.cache || 'no-store', // Default to no-store for fresh data
    // next: { revalidate: 0 } // Let Next.js decide or pass via options if needed
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'API Server Error' }));
    throw new Error(errorData.message || `HTTP ${res.status}`);
  }

  return res.json();
}