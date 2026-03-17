import { API_CONFIG } from '../config';
import { getAccessToken } from './apiClient';

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
};


/**
 * Emergency API Client
 * Handles authentication for ambulance personnel with separate token refresh logic
 */
export async function emergencyApiClient<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const isClient = typeof window !== 'undefined';
  const isAmbulanceContext = isClient && sessionStorage.getItem('userRole') === 'ambulance';
  
  // Priority: 
  // 1. shared in-memory token 
  // 2. sessionStorage token (if in ambulance context)
  // 3. cookie token (only as last resort, and not if we're in an ambulance context to avoid helpdesk leakage)
  let token = getAccessToken();
  
  if (!token && isClient) {
    const sessionToken = sessionStorage.getItem('accessToken');
    if (sessionToken) {
      token = sessionToken;
    } else if (!isAmbulanceContext) {
      // ONLY fallback to cookies if we are NOT explicitly in an ambulance personnel session
      // This prevents a helpdesk cookie in another tab from being used here
      token = getCookie('accessToken');
    }
  }

  // 🚀 SANITIZATION: Remove surrounding quotes (common if stored via some JSON utils)
  if (token && typeof token === 'string' && token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }

  console.log('🚑 Emergency API Client:', { path, hasToken: !!token, isAmbulanceContext });

  // Construct headers
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  // Merge existing headers if any
  if (options?.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => headers.set(key, value));
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => headers.set(key, value));
    } else {
      Object.entries(options.headers).forEach(([key, value]) => headers.set(key, value));
    }
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    console.log('🔑 Token added to request');
  } else {
    console.warn('⚠️ No token found for emergency API call');
  }

  // ✅ CSRF PROTECTION: Double Submit Cookie (Namespaced for multi-tenancy)
  const csrfName = activeHospitalId ? `csrf_token_${activeHospitalId}` : "csrf_token";
  const csrfToken = getCookie(csrfName);
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  // ✅ ENFORCE SESSION ISOLATION
  const sessionId = typeof window !== "undefined" ? sessionStorage.getItem("sessionId") : null;
  if (sessionId) {
    headers.set("X-Session-Id", sessionId);
  }

  // ✅ MULTI-TENANCY: Inject X-Hospital-Id
  const activeHospitalId = typeof window !== "undefined" ? sessionStorage.getItem("activeHospitalId") : null;
  if (activeHospitalId) {
    headers.set("X-Hospital-Id", activeHospitalId);
  }

  const url = `${API_CONFIG.BASE_URL}${path}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    }).catch((fetchError) => {
      console.error(`❌ Network error calling ${path}:`, fetchError);
      const networkError = new Error(
        fetchError.message === 'Failed to fetch'
          ? `Cannot connect to server. Please ensure the backend is running at ${API_CONFIG.BASE_URL}`
          : `Network error: ${fetchError.message}`
      );
      (networkError as any).isNetworkError = true;
      throw networkError;
    });

    // Handle 401 Unauthorized - use EMERGENCY refresh endpoint
    if (res.status === 401 && isClient && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
        if (!isRefreshing) {
          isRefreshing = true;
          console.log('🔄 Refreshing emergency token (from cookie)...');

          try {
            // Use EMERGENCY refresh endpoint
            // Since refreshToken is HttpOnly, we don't need to send it in the body.
            // credentials: "include" will send the cookie.
            const refreshRes = await fetch(`${API_CONFIG.BASE_URL}/emergency/auth/refresh`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
                ...(sessionId && { 'X-Session-Id': sessionId })
              },
              credentials: "include",
            });

            if (refreshRes.ok) {
              const data = await refreshRes.json();
              // Standard matching for emergency refresh response format
              const newAccessToken = data.accessToken || (data.tokens && data.tokens.accessToken);

              if (newAccessToken) {
                  sessionStorage.setItem('accessToken', newAccessToken);
                  // Refresh token is updated via cookie automatically
                  if (data.sessionId) {
                      sessionStorage.setItem('sessionId', data.sessionId);
                  }
                  
                  console.log('✅ Emergency token refreshed');
                  isRefreshing = false;
                  onTokenRefreshed(newAccessToken);
              } else {
                  throw new Error('No access token in refresh response');
              }
            } else {
              console.error('❌ Emergency token refresh failed');
              throw new Error('Refresh failed');
            }
          } catch (error) {
            console.error('❌ Emergency refresh error:', error);
            isRefreshing = false;
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('refreshToken');
            window.dispatchEvent(new Event('auth-logout'));
            // Redirect to emergency login
            window.location.href = '/emergency-login';
            throw new Error('Session expired');
          }
        }

        // Wait for token refresh and retry request
        return new Promise<T>((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            headers.set('Authorization', `Bearer ${newToken}`);
            fetch(url, { ...options, headers, credentials: "include" })
              .then(resp => {
                if (!resp.ok) return resp.json().then(err => { throw new Error(err.message || `HTTP ${resp.status}`) });
                return resp.json();
              })
              .then(resolve)
              .catch(reject);
          });
        });
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'API Error' }));
      if (res.status !== 404) {
        console.error(`❌ Emergency API Error [${res.status}] ${path}:`, errorData);
      }
      const errorMessage = errorData.message || `HTTP ${res.status}`;
      const error = new Error(errorMessage);
      (error as any).status = res.status;
      (error as any).error = errorData.error || errorData;
      throw error;
    }

    return res.json();
  } catch (error: any) {
    if (error?.status !== 404 && !error?.message?.includes('404')) {
      console.error(`❌ Emergency API Error ${path}:`, error);
    }
    throw error;
  }
}
