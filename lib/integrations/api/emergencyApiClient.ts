import { API_CONFIG } from '../config';

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
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
  const token = isClient ? sessionStorage.getItem('accessToken') : null;

  console.log('🚑 Emergency API Client:', { path, hasToken: !!token });

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

  const url = `${API_CONFIG.BASE_URL}${path}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
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
      const refreshToken = sessionStorage.getItem('refreshToken');

      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          console.log('🔄 Refreshing emergency token...');

          try {
            // Use EMERGENCY refresh endpoint
            const refreshRes = await fetch(`${API_CONFIG.BASE_URL}/emergency/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshRes.ok) {
              const data = await refreshRes.json();
              const newAccessToken = data.tokens.accessToken;
              const newRefreshToken = data.tokens.refreshToken;

              sessionStorage.setItem('accessToken', newAccessToken);
              sessionStorage.setItem('refreshToken', newRefreshToken);

              console.log('✅ Emergency token refreshed successfully');

              isRefreshing = false;
              onTokenRefreshed(newAccessToken);
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
            fetch(url, { ...options, headers })
              .then(resp => {
                if (!resp.ok) return resp.json().then(err => { throw new Error(err.message || `HTTP ${resp.status}`) });
                return resp.json();
              })
              .then(resolve)
              .catch(reject);
          });
        });
      }
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
