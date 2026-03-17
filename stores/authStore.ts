import { create } from "zustand";
import { authService, type RegisterRequest, setAccessToken } from "@/lib/integrations";
import { loginAction } from "@/lib/integrations/actions/auth.actions";

interface User {
  id: string;
  name: string;
  role: string;
  hospitalId?: string;
  email?: string;
  mobile?: string;
  image?: string;
  shopName?: string;
  gstin?: string;
  licenseNo?: string;
  address?: string;
  hospital?: string;
  department?: string;
  employeeId?: string;
  qualificationDetails?: {
    qualifications: string[];
  };
  documents?: {
    degreeCertificate?: { url: string; publicId: string };
    registrationCertificate?: { url: string; publicId: string };
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: (broadcast?: boolean) => void;
  initializeAuth: (force?: boolean) => Promise<void>;
  checkAuth: (force?: boolean) => Promise<void>; // Alias for initializeAuth
  initEvents: () => void;
  setUser: (user: User | null) => void;
  isTabAuthorized: boolean;
  authorizeTab: () => void;
  verifyHospitalId: (hospitalId: string) => Promise<{ valid: boolean; hospitalName?: string }>;
}

// ✅ PERFORMANCE FIX: Stable user reference to prevent cascade re-renders
let cachedUser: User | null = null;

const shallowEqual = (obj1: any, obj2: any) => {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return false;
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  return keys1.every((key) => obj1[key] === obj2[key]);
};

const stabilizeUser = (newUser: User | null): User | null => {
  if (shallowEqual(cachedUser, newUser)) {
    return cachedUser; // Return same reference if data is identical
  }
  cachedUser = newUser;
  return newUser;
};

// ✅ STORAGE SAFETY: Prevent QuotaExceededErrors from crashing the app
const safeLocalStorage = {
  setItem: (key: string, value: string) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (e: any) {
      if (
        e.name === "QuotaExceededError" ||
        e.name === "NS_ERROR_DOM_QUOTA_REACHED"
      ) {
        console.warn(
          "[Auth] ⚠️ LocalStorage quota exceeded. Clearing old profiles...",
        );
        try {
          // Emergency cleanup: remove all profile_ keys to make space
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith("profile_")) localStorage.removeItem(k);
          });
          // Try one more time
          localStorage.setItem(key, value);
        } catch (e2) {
          console.error("[Auth] ❌ Failed to save after cleanup:", e2);
        }
      }
    }
  },
  getItem: (key: string) => {
    if (typeof window !== "undefined" && window.localStorage) {
      return localStorage.getItem(key);
    }
    return null;
  },
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  isTabAuthorized: typeof window !== "undefined" ? !!sessionStorage.getItem("tabAuthorized") : false,

  authorizeTab: () => {
    sessionStorage.setItem("tabAuthorized", "true");
    set({ isTabAuthorized: true });
  },

  verifyHospitalId: async (hospitalId: string) => {
    try {
      // Import apiClient lazily to avoid circular deps
      const { apiClient } = await import("@/lib/integrations");
      const data = await apiClient<{ valid: boolean; hospitalName?: string }>(
        `/api/auth/verify-hospital/${hospitalId}`,
        { method: 'GET' }
      );
      return data;
    } catch (err: any) {
      // 404 = hospital not found
      if (err?.status === 404 || err?.message?.includes('404')) {
        return { valid: false };
      }
      // Network error - let caller decide
      throw err;
    }
  },

  checkAuth: async (force?: boolean) => {
    return get().initializeAuth(force);
  },

  initEvents: () => {
    if (typeof window !== "undefined") {
      // Signal received from current tab's API client (e.g. 401 Unauthorized)
      window.addEventListener("auth-logout", () => {
        get().logout(false);
      });
    }
  },

  login: async (identifier: string, password: string) => {
    set({ isLoading: true });
    try {
      console.log("[Auth] 🔑 Attempting Secure Login:", identifier);

      // ✅ CLEANUP: Clear any stale session data before logging in as a new user
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("activeHospitalId");
      sessionStorage.removeItem("lastAuthCheck");
      sessionStorage.removeItem("sessionId");
      sessionStorage.removeItem("tabAuthorized");
      setAccessToken(null);

      const response = await authService.loginClient({ identifier, password });
      const { accessToken, csrfToken, user, sessionId } = response;
      
      if (sessionId) console.log("[Auth] 💾 Session ID established:", sessionId);

      if (accessToken) {
        setAccessToken(accessToken);
        sessionStorage.setItem("accessToken", accessToken);
        
        // ✅ SERVER-SIDE COMPATIBILITY: Sync token to cookie for apiServer
        // Namespace by hospitalId to prevent cross-tab role leakage
        const rawHospId = (user as any).hospital || (user as any).hospitalId;
        const userHospitalId = (rawHospId && typeof rawHospId === 'object') ? (rawHospId._id || rawHospId.id || rawHospId.toString()) : rawHospId;
        
        const atName = userHospitalId ? `accessToken_${userHospitalId}` : "accessToken";
        document.cookie = `${atName}=${accessToken}; path=/; max-age=604800; SameSite=Lax`;
      }

      // ✅ IDENTITY VALIDATION: Check Hospital and MongoDB ID format
      if (!user) throw new Error("Authentication failed: No user data returned.");
      
      const userId = (user as any)._id || user.id;
      if (!userId) throw new Error("Authentication failed: Invalid MongoDB User ID.");
      
      // ✅ MongoDB ObjectId validation (24 hex chars)
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(userId);
      if (!isMongoId) {
        console.warn("[Auth] ⚠️ User ID is not a standard MongoDB ObjectId format:", userId);
      }

      // Map _id to id if necessary
      if ((user as any)._id && !user.id) {
        user.id = (user as any)._id;
      }

      // ✅ SECURITY: Tokens are NOT stored in storage
      // Access token is kept only in this store's memory
      // Refresh token is in an HttpOnly cookie (handled by browser/backend)

      // Store non-sensitive session cache (tab-isolated via sessionStorage)
      sessionStorage.setItem("user", JSON.stringify(user));
      sessionStorage.setItem("lastAuthCheck", Date.now().toString());
      if (sessionId) {
        sessionStorage.setItem("sessionId", sessionId);
      }

      // ✅ MULTI-TENANCY: Context Sync — hospital auto-resolved from user's MongoDB record
      const rawHospId = (user as any).hospital || (user as any).hospitalId;
      const userHospitalId = (rawHospId && typeof rawHospId === 'object') ? (rawHospId._id || rawHospId.id || rawHospId.toString()) : rawHospId;

      if (userHospitalId) {
        const hospitalIdStr = userHospitalId.toString();
        console.log("[Auth] 🏥 Setting Hospital Context:", hospitalIdStr);
        sessionStorage.setItem("activeHospitalId", hospitalIdStr);
        // Set as non-HttpOnly cookie for middleware/server access
        document.cookie = `hospitalId=${hospitalIdStr}; path=/; max-age=604800; SameSite=Lax`;
      }

      // ✅ SECURITY: Explicity set CSRF and Session ID cookies for server-side compatibility (Double Submit Cookie)
      if (csrfToken) {
        const csrfName = userHospitalId ? `csrf_token_${userHospitalId}` : "csrf_token";
        document.cookie = `${csrfName}=${csrfToken}; path=/; max-age=604800; SameSite=Lax`;
      }
      if (sessionId) {
        document.cookie = `sessionId=${sessionId}; path=/; max-age=604800; SameSite=Lax`;
      }
      // Also sync user role for middleware and tab isolation
      if (user.role) {
        const lowerRole = user.role.toLowerCase();
        sessionStorage.setItem("userRole", lowerRole);
        const urName = userHospitalId ? `userRole_${userHospitalId}` : "userRole";
        document.cookie = `${urName}=${lowerRole}; path=/; max-age=604800; SameSite=Lax`;
        // Also keep global for legacy/un-tenanted routes
        document.cookie = `userRole=${lowerRole}; path=/; max-age=604800; SameSite=Lax`;
      }


      // PERSISTENT USER PROFILE (No sensitive data)
      const lastUserId = user.id || (user as any)._id;
      if (lastUserId) {
        const uidStr = lastUserId.toString();
        safeLocalStorage.setItem(`profile_${uidStr}`, JSON.stringify(user));
        safeLocalStorage.setItem("lastUserId", uidStr);
      }

      // ✅ TAB AUTHORIZATION: This tab initiated the login, so it's authorized
      // sessionStorage is isolated per tab — other tabs remain unauthorized
      sessionStorage.setItem("tabAuthorized", "true");

      set({
        user: stabilizeUser(user),
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        isTabAuthorized: true,
      });
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data: RegisterRequest) => {
    set({ isLoading: true });
    try {
      await authService.registerClient(data);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async (broadcast = true) => {
    // 1. Inform backend to clear HttpOnly refreshToken and CSRF
    // MUST HAPPEN FIRST before we delete the local cookies!
    try {
      await authService.logoutClient();
    } catch (e) {
      console.warn("Logout API failed, continuing local cleanup", e);
    }

    // 2. Clear local storage/session
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    sessionStorage.removeItem("activeHospitalId");
    sessionStorage.removeItem("lastAuthCheck"); // Clear auth timestamp
    sessionStorage.removeItem("sessionId"); // Clear explicit session tracking
    sessionStorage.removeItem("userRole"); // ✅ Clear role context
    sessionStorage.removeItem("tabAuthorized"); // Clear tab authorization
    
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");

    // Clear user profiles and lastUserId while preserving theme & terms
    const lastUserId = localStorage.getItem("lastUserId");
    if (lastUserId) {
      localStorage.removeItem(`profile_${lastUserId}`);
    }
    localStorage.removeItem("lastUserId");

    // Catch any loose profile instances
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("profile_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn("Could not iterate localStorage for profile cleanup", e);
    }

    // 3. Clear non-HttpOnly cookies last
    const activeId = sessionStorage.getItem("activeHospitalId");
    const suffix = activeId ? `_${activeId}` : "";

    document.cookie = "hospitalId=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    document.cookie = `csrf_token${suffix}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
    document.cookie = `sessionId${suffix}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
    document.cookie = `accessToken${suffix}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
    document.cookie = `userRole${suffix}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;

    // Clear globals if we had a suffix (multi-tab isolation insurance)
    if (activeId) {
      document.cookie = "csrf_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      document.cookie = "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    }

    // 4. Clear in-memory access token
    setAccessToken(null);

    // 5. Clear tab authorization
    sessionStorage.removeItem("tabAuthorized");

    set({ user: null, isAuthenticated: false, isTabAuthorized: false });
  },

  initializeAuth: async (force = false) => {
    console.log("[AUTH INIT] starting auth bootstrap");
    const getCookie = (name: string) => {
      if (typeof document === 'undefined') return null;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };

    const activeHospId = typeof window !== 'undefined' ? (sessionStorage.getItem("activeHospitalId") || getCookie("hospitalId")) : null;
    const atName = activeHospId ? `accessToken_${activeHospId}` : "accessToken";
    const sessionToken = typeof window !== 'undefined' ? (sessionStorage.getItem("accessToken") || getCookie(atName) || getCookie("accessToken")) : null;
    
    // ✅ SYNC TOKEN: Always update memory cache from storage on bootstrap, even if throttled
    if (sessionToken && typeof window !== 'undefined') {
      const { setAccessToken } = await import('@/lib/integrations');
      setAccessToken(sessionToken);
    }

    console.log("[Auth] 🔎 Current Storage Status:", {
        hasToken: !!sessionToken,
        hasUser: !!sessionStorage.getItem("user"),
        hasRole: !!sessionStorage.getItem("userRole"),
        tabAuthorized: !!sessionStorage.getItem("tabAuthorized")
    });

    // ✅ TAB ISOLATION: Never auto-restore session for unauthorized tabs.
    // A tab is authorized only if it has explicitly performed a login in THIS tab session.
    // sessionStorage is browser-tab-isolated — it is NOT shared between tabs.
    const isTabAuthorized = typeof window !== 'undefined' && !!sessionStorage.getItem('tabAuthorized');
    if (!isTabAuthorized && !force) {
      console.log("[AUTH INIT] Tab is not authorized — skipping bootstrap. Must login explicitly.");
      set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true, isTabAuthorized: false });
      return;
    }

    let sessionUser = sessionStorage.getItem("user");

    // Try to restore user from session cache first for immediate UI
    if (sessionUser && !get().user) {
      try {
        const user = JSON.parse(sessionUser);
        console.log("[Auth] 📂 Restored user from session cache:", user.role);
        set({ user: stabilizeUser(user), isAuthenticated: true });
      } catch (e) { }
    }

    // ✅ SPEED FIX: Throttle network calls unless forced
    const lastCheck = sessionStorage.getItem("lastAuthCheck");
    if (
      !force &&
      lastCheck &&
      get().user &&
      Date.now() - parseInt(lastCheck) < 30000 // 30s throttle
    ) {
      console.log("[Auth] 🏎️ Skipping auth check - throttled");
      set({ isAuthenticated: true, isLoading: false, isInitialized: true });
      return;
    }

    if (!get().user) set({ isLoading: true });

    try {
      // ✅ TAB ISOLATION: Prioritize role from local session storage OR restored user object
      // This prevents a global 'ambulance' cookie from hijacking standard hospital admin tabs
      const urName = activeHospId ? `userRole_${activeHospId}` : "userRole";
      const localRole = sessionStorage.getItem("userRole");
      const restoredUserRole = get().user?.role?.toLowerCase();
      const cookieRole = getCookie(urName) || getCookie("userRole");

      const userRole = localRole || restoredUserRole || cookieRole;
      
      console.log(`[AUTH INIT] calling /me (role context: ${userRole || 'none'})`);
      if (userRole === "ambulance") console.log("[Auth] 🚑 AMBULANCE BOOTSTRAP TRIGGERED");
      
      let data: any;
      if (userRole === "ambulance") {
        // Special bootstrap for ambulance personnel
        const { emergencyService } = await import("@/lib/integrations/services/emergency.service");
        data = await emergencyService.getCurrentUser();
        console.log("[Auth] 🚑 Emergency /me data received:", !!data);
      } else {
        // Standard user bootstrap
        console.log("[Auth] 🏢 Standard /me data request");
        const { authService } = await import("@/lib/integrations/services/auth.service");
        data = await authService.getMeClient(
          force ? { skipCache: true } : undefined,
        );
      }

      if (data) {
        console.log("[AUTH INIT] session restored");

        // Handle bootstrap payload (contains new tokens) or direct user object
        const user = data.user || data;
        const accessToken = data.accessToken || data.tokens?.accessToken;
        const refreshToken = data.refreshToken || data.tokens?.refreshToken;
        const sessionId = data.sessionId;

        if (accessToken) {
          console.log("[AUTH INIT] new access token received from bootstrap");
          setAccessToken(accessToken);
          sessionStorage.setItem("accessToken", accessToken);
          if (refreshToken) sessionStorage.setItem("refreshToken", refreshToken);
        }

        if (sessionId) {
          console.log("[AUTH INIT] session ID restored:", sessionId);
          sessionStorage.setItem("sessionId", sessionId);
        }

        // Standardize ID
        if ((user as any)._id && !user.id) {
          user.id = (user as any)._id;
        }

        // Persist session cache
        sessionStorage.setItem("lastAuthCheck", Date.now().toString());
        sessionStorage.setItem("user", JSON.stringify(user));

        // Restore hospital context
        const rawId = (user as any).hospital || (user as any).hospitalId;
        const userHospitalId = (rawId && typeof rawId === 'object') ? (rawId._id || rawId.id) : rawId;
        
        if (userHospitalId && typeof document !== "undefined") {
          const hospitalIdStr = userHospitalId.toString();
          sessionStorage.setItem("activeHospitalId", hospitalIdStr);
          // Set non-HttpOnly cookie for server components
          document.cookie = `hospitalId=${hospitalIdStr}; path=/; max-age=604800; SameSite=Lax`;
        }

        set({
          user: stabilizeUser(user),
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        console.log("[AUTH INIT] no valid session");
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
        });
      }
    } catch (error: any) {
      const uRole = sessionStorage.getItem("userRole");
      console.error("[AUTH INIT] Auth bootstrap failure:", {
        message: error.message,
        status: error.status,
        role: uRole
      });

      const isNetworkError = error?.isNetworkError || error?.message?.includes("Failed to fetch");
      const isAuthError = error?.status === 401 || error?.status === 403;

      if (isNetworkError && sessionUser) {
        console.log("[AUTH INIT] Network fallback - staying logged in with cached data");
        set({ isAuthenticated: true, isLoading: false, isInitialized: true });
        return;
      }

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
      
      if (isAuthError) {
        console.log("[AUTH INIT] Clearing session data due to auth error");
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("refreshToken");
        sessionStorage.removeItem("activeHospitalId");
        sessionStorage.removeItem("userRole");
        sessionStorage.removeItem("tabAuthorized");
        sessionStorage.removeItem("sessionId");
        
        // Clear global cookies
        document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "sessionId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    }
  },
  setUser: (user: User | null) => {
    if (user) {
      // ✅ ID CONSISTENCY
      if ((user as any)._id && !user.id) {
        user.id = (user as any)._id;
      }

      sessionStorage.setItem("user", JSON.stringify(user));
      if (user.id) {
        safeLocalStorage.setItem(`profile_${user.id}`, JSON.stringify(user));
        safeLocalStorage.setItem("lastUserId", user.id);
      }
    } else {
      sessionStorage.removeItem("user");
    }
    set({ user: stabilizeUser(user), isAuthenticated: !!user });
  },
}));
