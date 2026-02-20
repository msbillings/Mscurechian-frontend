import { API_CONFIG } from "../config";

// Memory cache for GET requests
const apiCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 10 * 1000; // 10 seconds (Hyper-dynamic)

/**
 * MULTI-TENANCY: Get the active hospital ID for the current request.
 *
 * Priority order:
 * 1. URL path first segment (e.g. /abc123.../doctor → abc123...)
 * 2. sessionStorage 'activeHospitalId'
 * 3. null (SuperAdmin global access or unauthenticated)
 */
const isValidHospitalId = (segment: string): boolean => {
  if (!segment) return false;
  // MongoDB ObjectId: exactly 24 hex characters
  if (/^[a-f0-9]{24}$/i.test(segment)) return true;
  // Hospital slug: alphanumeric with hyphens
  if (/^[a-z0-9][a-z0-9-]{2,58}[a-z0-9]$/i.test(segment)) return true;
  return false;
};

const getActiveHospitalId = (): string | null => {
  if (typeof window === "undefined") return null;

  // 1. Check URL path — first segment is the hospitalId in tenant routes
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  if (pathParts.length > 0 && isValidHospitalId(pathParts[0])) {
    return pathParts[0];
  }

  // 2. Fallback to sessionStorage (set by useTenantContext hook)
  const stored = sessionStorage.getItem("activeHospitalId");
  if (stored && isValidHospitalId(stored)) {
    return stored;
  }

  return null;
};

const existingRequests = new Map<string, Promise<any>>();
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];
let cachedToken: string | null = null;

// Export clear cache utility (useful for logout or manual refresh)
export const clearApiCache = () => {
  apiCache.clear();
  existingRequests.clear();
};

export const invalidateCachePattern = (pattern: string) => {
  if (typeof pattern !== "string") return;
  for (const key of apiCache.keys()) {
    if (key.includes(pattern)) {
      apiCache.delete(key);
    }
  }
};

// Initialize cached token
if (typeof window !== "undefined") {
  cachedToken = sessionStorage.getItem("accessToken");
}

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
  cachedToken = token; // Update cached token on refresh
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export async function apiClient<T>(
  path: string,
  options?: RequestInit & { skipCache?: boolean },
): Promise<T> {
  const isClient = typeof window !== "undefined";

  if (!cachedToken && isClient) {
    cachedToken = sessionStorage.getItem("accessToken");
  }
  // FORCE REFRESH: Always check session storage if we might be missing it
  let token =
    cachedToken || (isClient ? sessionStorage.getItem("accessToken") : null);

  // Sanitize token: Remove surrounding quotes if they exist (common storage artifact)
  if (token && token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }

  // Construct headers more robustly
  const headers = new Headers();
  if (!(options?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Merge existing headers if any
  if (options?.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => headers.set(key, value));
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => headers.set(key, value));
    } else {
      Object.entries(options.headers).forEach(([key, value]) =>
        headers.set(key, value),
      );
    }
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // ✅ MULTI-TENANCY: Inject X-Hospital-Id header for backend tenant isolation
  // Backend tenantMiddleware reads this to scope all queries to the correct hospital
  const activeHospitalId = getActiveHospitalId();
  if (activeHospitalId) {
    headers.set("X-Hospital-Id", activeHospitalId);
  }

  const url = `${API_CONFIG.BASE_URL}${path}`;
  const method = options?.method || "GET";
  const cacheKey = `${method}:${url}`;

  // Global event listener for logout
  if (isClient && !(window as any).hasAuthLogoutListener) {
    window.addEventListener("auth-logout", clearApiCache);
    (window as any).hasAuthLogoutListener = true;
  }

  // 1. Check Memory Cache for GET requests
  if (method === "GET" && !options?.skipCache && isClient) {
    const cached = apiCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T;
    }
  }

  // 2. Deduplication: If a GET request is already in flight, return the existing promise
  if (method === "GET" && existingRequests.has(cacheKey)) {
    return existingRequests.get(cacheKey) as Promise<T>;
  }

  const requestPromise = (async () => {
    try {
      const res = await fetch(url, {
        ...options,
        headers,
        cache: "no-store",
      }).catch((fetchError) => {
        // Handle network errors

        const isAuthCheck =
          path.includes("/auth/me") || path.includes("/auth/refresh");
        const isLogin = path.includes("/auth/login");

        if (!isAuthCheck && isLogin) {
          console.warn(`⚠️ Backend server appears to be offline.`);
          console.warn(`   URL: ${API_CONFIG.BASE_URL}`);
        }

        const networkError = new Error(
          fetchError.message === "Failed to fetch"
            ? `Cannot connect to server. Please ensure the backend is running at ${API_CONFIG.BASE_URL}`
            : `Network error: ${fetchError.message}`,
        );
        (networkError as any).isNetworkError = true;
        throw networkError;
      });

      // Handle 401 Unauthorized
      const pathLower = path.toLowerCase();
      const isLoginRequest =
        pathLower.includes("login") ||
        pathLower.includes("sign-in") ||
        pathLower.includes("signin") ||
        pathLower.includes("auth");
      const isRefreshRequest = pathLower.includes("/refresh");

      // Also check if we are physically on a login page to be doubly safe
      const currentPath = isClient
        ? window.location.pathname.toLowerCase()
        : "";
      const isOnLoginPage =
        currentPath.includes("login") ||
        currentPath.includes("sign-in") ||
        currentPath.includes("signin");

      if (res.status === 401) {
        console.log(
          `[API] 401 on ${path}. isLoginRequest=${isLoginRequest}, isOnLoginPage=${isOnLoginPage}`,
        );
      }

      if (
        res.status === 401 &&
        isClient &&
        !isLoginRequest &&
        !isRefreshRequest &&
        !isOnLoginPage
      ) {
        const refreshToken = sessionStorage.getItem("refreshToken");

        if (refreshToken) {
          if (!isRefreshing) {
            isRefreshing = true;
            try {
              const refreshRes = await fetch(
                `${API_CONFIG.BASE_URL}/auth/refresh`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ refreshToken }),
                },
              );

              if (refreshRes.ok) {
                const data = await refreshRes.json();
                sessionStorage.setItem("accessToken", data.tokens.accessToken);
                sessionStorage.setItem(
                  "refreshToken",
                  data.tokens.refreshToken,
                );

                // Sync cookies for Server Actions
                import("../actions/auth.actions").then(
                  ({ syncSessionAction }) => {
                    syncSessionAction(
                      data.tokens.accessToken,
                      data.tokens.refreshToken,
                    );
                  },
                );

                onTokenRefreshed(data.tokens.accessToken);
              } else {
                throw new Error("Refresh failed");
              }
            } catch (error) {
              sessionStorage.removeItem("accessToken");
              sessionStorage.removeItem("refreshToken");
              cachedToken = null;
              window.dispatchEvent(new Event("auth-logout"));

              // Smart role-aware redirect to correct login page
              const currentPath = window.location.pathname.toLowerCase();
              const isLoginPage =
                currentPath.includes("/login") ||
                currentPath.includes("sign-in") ||
                currentPath.includes("signin");
              if (!isLoginPage) {
                // Determine redirect based on current path context
                const pathParts = window.location.pathname
                  .split("/")
                  .filter(Boolean);
                const firstSegment = pathParts[0] || "";
                const secondSegment = pathParts[1] || "";

                // Check if we're in a tenant-prefixed portal (/{hospitalId}/lab, etc.)
                const portalSegment =
                  pathParts.length >= 2 ? secondSegment : firstSegment;

                const roleLoginMap: Record<string, string> = {
                  lab: "/auth/lab/login",
                  nurse: "/auth/nurse/login",
                  pharmacy: "/auth/pharmacy/login",
                  pharma: "/auth/pharmacy/login",
                  emergency: "/emergency-login",
                  discharge: "/auth/login",
                };

                const redirectTo = roleLoginMap[portalSegment] || "/auth/login";
                window.location.href = redirectTo;
              }

              const sessionError = new Error(
                "Your session has expired. Please login again.",
              );
              (sessionError as any).isSessionExpired = true;
              throw sessionError;
            } finally {
              isRefreshing = false;
            }
          }

          return new Promise<T>((resolve, reject) => {
            subscribeTokenRefresh((newToken) => {
              headers.set("Authorization", `Bearer ${newToken}`);
              fetch(url, { ...options, headers })
                .then((resp) => {
                  if (!resp.ok)
                    return resp.json().then((err) => {
                      throw new Error(err.message || `HTTP ${resp.status}`);
                    });
                  return resp.json();
                })
                .then(resolve)
                .catch(reject);
            });
          });
        }
      }

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: "API Error" }));
        if (res.status !== 404) {
          console.error(`API Error [${res.status}] ${path}:`, errorData);
        }
        let errorMessage = errorData.message || `HTTP ${res.status}`;
        if (typeof errorData === "object" && errorData.error) {
          errorMessage =
            typeof errorData.error === "string"
              ? errorData.error
              : errorData.error.message || errorMessage;
        }
        const error = new Error(errorMessage);
        (error as any).status = res.status;
        (error as any).error = errorData.error || errorData;
        throw error;
      }

      const data = await res.json();

      // Clear cache on mutations (POST, PUT, DELETE, etc.)
      if (method !== "GET" && isClient) {
        clearApiCache();
      }

      // 3. Store in Memory Cache if GET
      if (method === "GET" && !options?.skipCache && isClient) {
        apiCache.set(cacheKey, {
          data,
          expiry: Date.now() + CACHE_TTL,
        });
      }

      return data;
    } catch (error: any) {
      const isAuthEndpoint =
        path.includes("/auth/me") || path.includes("/auth/refresh");
      const isLogin = path.includes("/auth/login");
      const isNetworkError =
        error?.isNetworkError ||
        error?.message?.includes("Cannot connect to server");

      if (
        error?.status !== 404 &&
        !error?.message?.includes("404") &&
        !error?.message?.toLowerCase().includes("not found")
      ) {
        if (!isAuthEndpoint || (!isNetworkError && isLogin)) {
          if (!isNetworkError || isLogin) {
            console.error(`API Error ${path}:`, error);
          }
        }
      }
      throw error;
    }
  })();

  // Deduplication handling
  if (method === "GET") {
    existingRequests.set(cacheKey, requestPromise);
    requestPromise.finally(() => {
      existingRequests.delete(cacheKey);
    });
  }

  return requestPromise;
}
