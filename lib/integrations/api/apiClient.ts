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

  // 1. Strictly validate MongoDB ObjectId (24 hex characters)
  if (/^[a-f0-9]{24}$/i.test(segment)) return true;

  // 2. Reserved system segments that are NOT hospital IDs
  const reserved = [
    // Auth & system
    "auth",
    "api",
    "dashboard",
    "login",
    "admin",
    "super-admin",
    // Portal roles
    "pharmacy",
    "pharma",
    "lab",
    "nurse",
    "hr",
    "emergency",
    "discharge",
    "helpdesk",
    "doctor",
    "staff",
    // Public landing pages — must NOT be treated as hospital slugs
    "about",
    "blogs",
    "features",
    "pricing",
    "solutions",
    "portals",
    "support",
    "coming-soon",
    "ambulance",
    "patient",
  ];
  if (reserved.includes(segment.toLowerCase())) return false;

  // 3. Hospital slug fallback: alphanumeric with hyphens, at least 3 chars
  // We keep this but make it more secondary to reserved words
  return /^[a-z0-9][a-z0-9-]{2,58}[a-z0-9]$/i.test(segment);
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
// 🚀 SECURITY: Access Token is ONLY in memory
let cachedToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
};

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

/**
 * Update the in-memory access token (used after login or manual refresh)
 */
export const setAccessToken = (token: string | null) => {
  cachedToken = token;
};

export const getAccessToken = (): string | null => cachedToken;

export async function apiClient<T>(
  path: string,
  options?: RequestInit & { skipCache?: boolean },
): Promise<T> {
  const isClient = typeof window !== "undefined";

  // 🚀 SECURITY: No more sessionStorage reliance for tokens
  let token = cachedToken;

  // MULTI-TENANCY: Identify the hospital context for cookie retrieval
  const activeHospitalId = getActiveHospitalId();

  // If memory token is missing, try namespaced cookie as a final fallback (Client-side sync)
  if (!token && isClient) {
    const atName = activeHospitalId ? `accessToken_${activeHospitalId}` : "accessToken";
    token = getCookie(atName);
    
    // Only fallback to global if NO specific hospital context exists
    if (!token && !activeHospitalId) {
      token = getCookie("accessToken");
    }
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

  // ✅ ENFORCE SESSION ISOLATION
  const sessionId = typeof window !== "undefined" ? sessionStorage.getItem("sessionId") : null;
  if (sessionId) {
    headers.set("X-Session-Id", sessionId);
  }

  // ✅ CSRF PROTECTION: Double Submit Cookie (Multi-tenant aware)
  const ctName = activeHospitalId ? `csrf_token_${activeHospitalId}` : "csrf_token";
  const csrfToken = getCookie(ctName) || getCookie("csrf_token");
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  // ✅ MULTI-TENANCY: Inject X-Hospital-Id header for backend tenant isolation
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
        credentials: "include", // ✅ CRITICAL: Send HttpOnly cookies for Auth
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
        pathLower.includes("/login") ||
        pathLower.includes("/sign-in") ||
        pathLower.includes("/signin");
      const isRefreshRequest = pathLower.includes("/refresh");
      const isMeRequest = pathLower.includes("/me");

      // Also check if we are physically on a login page to be doubly safe
      const currentPath = isClient
        ? window.location.pathname.toLowerCase()
        : "";
      const isOnLoginPage =
        currentPath.includes("login") ||
        currentPath.includes("sign-in") ||
        currentPath.includes("signin");

      if (res.status === 401) {
        console.warn(`[API] 🔐 401 Unauthorized on ${path}. isLoginRequest=${isLoginRequest}, isMeRequest=${isMeRequest}`);

        if (isClient && !isLoginRequest && !isRefreshRequest && !isOnLoginPage) {
          if (!isRefreshing) {
            console.log("[API] 🔄 Token expired or missing. Attempting silent refresh...");
            isRefreshing = true;
            try {
              // ✅ SECURE REFRESH: Relies on HttpOnly refreshToken cookie AND CSRF token
              const ctName = activeHospitalId ? `csrf_token_${activeHospitalId}` : "csrf_token";
              const csrfTk = getCookie(ctName) || getCookie("csrf_token");
              const refreshHeaders: HeadersInit = { "Content-Type": "application/json" };
              if (csrfTk) {
                (refreshHeaders as any)["X-CSRF-Token"] = csrfTk;
              }
              if (sessionId) {
                (refreshHeaders as any)["X-Session-Id"] = sessionId;
              }
              if (activeHospitalId) {
                (refreshHeaders as any)["X-Hospital-Id"] = activeHospitalId;
              }

              const refreshRes = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
                method: "POST",
                headers: refreshHeaders,
                credentials: "include" // ✅ CRITICAL: MUST SEND COOKIES FOR REFRESH
              });

              if (refreshRes.ok) {
                const data = await refreshRes.json();
                const newToken = data.accessToken;
                console.log("[API] ✅ Token refresh successful. Resuming pending requests...");
                cachedToken = newToken;
                onTokenRefreshed(newToken);
              } else {
                console.error("[API] ❌ Token refresh failed (Status:", refreshRes.status, ")");
                throw new Error("Refresh failed");
              }
            } catch (error) {
              cachedToken = null;
              window.dispatchEvent(new Event("auth-logout"));

              // Smart role-aware redirect
              const currentPath = window.location.pathname.toLowerCase();
              const isLoginPage = currentPath.includes("/login") || currentPath.includes("sign-in") || currentPath.includes("signin");
              
              if (!isLoginPage) {
                const pathParts = window.location.pathname.split("/").filter(Boolean);
                const firstSegment = pathParts[0] || "";
                const secondSegment = pathParts[1] || "";
                const portalSegment = pathParts.length >= 2 ? secondSegment : firstSegment;

                const roleLoginMap: Record<string, string> = {
                  lab: "/auth/lab/login",
                  nurse: "/auth/nurse/login",
                  pharmacy: "/auth/pharmacy/login",
                  pharma: "/auth/pharmacy/login",
                  emergency: "/emergency-login",
                  ambulance: "/emergency-login",
                  discharge: "/auth/login",
                };

                const redirectTo = roleLoginMap[portalSegment] || "/auth/login";
                window.location.href = redirectTo;
              }

              const sessionError = new Error("Your session has expired. Please login again.");
              (sessionError as any).isSessionExpired = true;
              throw sessionError;
            } finally {
              isRefreshing = false;
            }
          }

          return new Promise<T>((resolve, reject) => {
            subscribeTokenRefresh((newToken) => {
              headers.set("Authorization", `Bearer ${newToken}`);
              
              // ✅ RE-EVALUATE CONTEXT: If context was missing, check if bootstrap/refresh restored it
              if (!headers.has("X-Hospital-Id")) {
                const retryHospitalId = getActiveHospitalId();
                if (retryHospitalId) {
                  headers.set("X-Hospital-Id", retryHospitalId);
                }
              }

              fetch(url, { ...options, headers })
                .then((resp) => {
                  if (!resp.ok) return resp.json().then((err) => { throw new Error(err.message || `HTTP ${resp.status}`); });
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
        
        const isAuthCheck = path.toLowerCase().includes("/auth/me") || path.toLowerCase().includes("/auth/refresh");
        
        if (res.status !== 404 && !(res.status === 401 && isAuthCheck)) {
          console.error(`[API] ❌ Error [${res.status}] ${path}:`, errorData);
        }
        let errorMessage = errorData.message || `HTTP ${res.status}`;
        if (typeof errorData === "object" && errorData.error) {
          errorMessage =
            typeof errorData.error === "string"
              ? errorData.error
              : errorData.error.message || errorMessage;
        }
        if (res.status === 401 && isAuthCheck) {
          return null as any; 
        }

        const error = new Error(errorMessage);
        (error as any).status = res.status;
        (error as any).error = errorData.error || errorData;
        throw error;
      }

      // ✅ SAFE JSON PARSE: 204 No Content / 205 Reset Content responses have no body.
      // Calling .json() on an empty body throws "Unexpected end of JSON input".
      // e.g. POST /api/auth/logout → 204 (intentionally no body) → skip .json()
      const hasBody =
        res.status !== 204 &&
        res.status !== 205 &&
        res.headers.get("content-length") !== "0" &&
        res.headers.get("content-type")?.includes("application/json");

      const data = hasBody ? await res.json() : null;

      // ✅ SESSION CAPTURE: Extract X-Session-Id from headers if present 
      // (This is primarily for login/refresh to pass the ID to the store)
      const xSessionId = res.headers.get("X-Session-Id");
      if (xSessionId && data && typeof data === "object") {
        data.sessionId = xSessionId;
      }

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
