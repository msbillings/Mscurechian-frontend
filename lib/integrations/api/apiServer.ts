import { API_CONFIG } from '../config';
import { cookies, headers as getNextHeaders } from 'next/headers';

export async function apiServer<T>(
  path: string,
  options?: RequestInit
 ): Promise<T> {
  const cookieStore = await cookies();
  const headerStore = await getNextHeaders();

  // ✅ TENANT RESOLUTION: Prioritize header (from middleware URL) over global cookie
  const hospitalId = headerStore.get('X-Hospital-Id') || cookieStore.get('hospitalId')?.value;
  
  // ✅ NAMESPACED RESOLUTION: Prioritize hospital-specific cookies
  const atName = hospitalId ? `accessToken_${hospitalId}` : 'accessToken';
  const csrfName = hospitalId ? `csrf_token_${hospitalId}` : 'csrf_token';

  const accessToken = cookieStore.get(atName)?.value || cookieStore.get('accessToken')?.value;
  const csrfToken = cookieStore.get(csrfName)?.value || cookieStore.get('csrf_token')?.value;
  const sessionId = cookieStore.get('sessionId')?.value;

  const fullUrl = `${API_CONFIG.BASE_URL}${path}`;
  console.log(`[apiServer] Request: ${path} | Hospital: ${hospitalId}`);

  const isFormData = options?.body instanceof FormData;

  // Forward all existing cookies to the backend so CSRF cookie validation works
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');

  const fetchHeaders: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
    ...options?.headers,
  };

  if (accessToken) {
    (fetchHeaders as any)['Authorization'] = `Bearer ${accessToken}`;
  }

  if (csrfToken) {
    (fetchHeaders as any)['X-CSRF-Token'] = csrfToken;
  }

  if (hospitalId) {
    (fetchHeaders as any)['X-Hospital-Id'] = hospitalId;
  }

  if (sessionId) {
    (fetchHeaders as any)['X-Session-Id'] = sessionId;
  }

  const res = await fetch(fullUrl, {
    ...options,
    headers: fetchHeaders,
    cache: options?.cache || 'no-store',
  });

  // ✅ FORWARD COOKIES: If backend sends new cookies (e.g. rotated CSRF or session), forward to client
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const cookieStore = await cookies();
    // Simple parser for Set-Cookie header (handles multiple cookies)
    const cookies_to_set = setCookie.split(/,(?=[^;]+=[^;]+)/);
    cookies_to_set.forEach(cookieStr => {
      const [nameValue, ...parts] = cookieStr.split(';');
      const [name, value] = nameValue.split('=');
      if (name && value) {
        cookieStore.set(name.trim(), value.trim(), {
          path: '/',
          httpOnly: cookieStr.includes('HttpOnly'),
          secure: cookieStr.includes('Secure'),
          sameSite: cookieStr.includes('SameSite=Strict') ? 'strict' : 'lax',
        });
      }
    });
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'API Server Error' }));
    throw new Error(errorData.message || `HTTP ${res.status}`);
  }

  return res.json();
}