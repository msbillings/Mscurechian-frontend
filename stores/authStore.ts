import { create } from "zustand";
import { authService, type RegisterRequest } from "@/lib/integrations";
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
  checkAuth: (force?: boolean) => Promise<void>;
  initEvents: () => void;
  setUser: (user: User | null) => void;
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
      console.log("[Auth] Attempting Direct Login:", identifier);

      // ✅ FAST LOGIN: Talk directly to backend (Client Side) instead of Server Action
      // This saves a round-trip hop to the Next.js server
      const response = await authService.loginClient({ identifier, password });
      const { tokens, user } = response;

      // Map _id to id if necessary
      if ((user as any)._id && !user.id) {
        user.id = (user as any)._id;
      }

      // ✅ CLEANUP: Clear any stale cookies from other portals
      if (typeof document !== 'undefined') {
        document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      }

      // PER-TAB ISOLATION
      sessionStorage.setItem("accessToken", tokens.accessToken);
      sessionStorage.setItem("refreshToken", tokens.refreshToken);
      sessionStorage.setItem("user", JSON.stringify(user));
      sessionStorage.setItem("lastAuthCheck", Date.now().toString()); // ✅ SPEED FIX: Throttle next check

      // ✅ SYNC TO COOKIES: Standardized longevity
      // 7 days for Patient/Doctor, 1 day for others
      const isLongLived = user.role === 'patient' || user.role === 'doctor';
      const accessMaxAge = isLongLived ? 604800 : 86400;
      const refreshMaxAge = 604800; // Keep refresh tokens for 7 days always

      document.cookie = `accessToken=${tokens.accessToken}; path=/; max-age=${accessMaxAge}; SameSite=Lax`;
      document.cookie = `refreshToken=${tokens.refreshToken}; path=/; max-age=${refreshMaxAge}; SameSite=Lax`;

      // PERSISTENT REGISTRY
      if (user.id) {
        safeLocalStorage.setItem(`profile_${user.id}`, JSON.stringify(user));
        safeLocalStorage.setItem("lastUserId", user.id);

        // ✅ PERSISTENT LOGIN: If patient, mirror tokens to localStorage to prevent session termination
        if (user.role === 'patient') {
          localStorage.setItem("accessToken", tokens.accessToken);
          localStorage.setItem("refreshToken", tokens.refreshToken);
        }
      }

      set({
        user: stabilizeUser(user),
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
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

  logout: (broadcast = true) => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    sessionStorage.removeItem("user");

    // Clear localStorage mirroring
    if (typeof window !== 'undefined') {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }

    // Clear cookies as well
    document.cookie =
      "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    document.cookie =
      "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";

    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async (force = false) => {
    // Try sessionStorage first, fallback to localStorage (for persistent patient sessions)
    let token = sessionStorage.getItem("accessToken") || (typeof window !== "undefined" ? localStorage.getItem("accessToken") : null);
    let refreshToken = sessionStorage.getItem("refreshToken") || (typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null);
    let sessionUser = sessionStorage.getItem("user");

    // If no sessionUser, try to find the last logged in user in localStorage
    if (!sessionUser && typeof window !== "undefined") {
      const lastUserId = localStorage.getItem("lastUserId");
      if (lastUserId) {
        sessionUser = localStorage.getItem(`profile_${lastUserId}`);
      }
    }

    // Try to restore user from session/local first
    if (sessionUser && !get().user) {
      try {
        const user = JSON.parse(sessionUser);
        set({ user: stabilizeUser(user), isAuthenticated: !!token });

        // SYNC TO COOKIES: Ensure Server Actions have access if sessionStorage exists
        // This is critical for initial page loads after a refresh
        if (
          token &&
          typeof document !== "undefined" &&
          !document.cookie.includes("accessToken")
        ) {
          document.cookie = `accessToken=${token}; path=/; max-age=86400; SameSite=Lax`;
          const rfToken =
            refreshToken || sessionStorage.getItem("refreshToken");
          if (rfToken) {
            document.cookie = `refreshToken=${rfToken}; path=/; max-age=604800; SameSite=Lax`;
          }
        }
      } catch (e) { }
    }

    // ✅ SPEED FIX: Throttle network calls for session validation
    // If we just logged in or checked in the last 30 seconds, skip the backend call
    const lastCheck = sessionStorage.getItem("lastAuthCheck");
    if (
      !force &&
      lastCheck &&
      get().user &&
      Date.now() - parseInt(lastCheck) < 30000
    ) {
      console.log("[Auth] ⚡ Skipping redundant session check (Throttled)");
      set({ isAuthenticated: true, isLoading: false, isInitialized: true });
      return;
    }

    if (!token) {
      console.log("[Auth] No access token found, user is not authenticated");
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
      return;
    }

    // Optimization: If we already have a user from session/storage, don't show loading spinner
    // Just verify in background
    if (!get().user) {
      set({ isLoading: true });
    }

    try {
      const user = await authService.getMeClient(
        force ? { skipCache: true } : undefined,
      );

      // ✅ ID CONSISTENCY: Map _id to id if it's missing (prevents profile_undefined)
      if ((user as any)._id && !user.id) {
        user.id = (user as any)._id;
      }

      sessionStorage.setItem("lastAuthCheck", Date.now().toString()); // Update last check
      console.log("[Auth] ✅ Authentication successful:", {
        userId: user.id,
        userName: user.name,
        role: user.role,
      });

      // Keep session updated
      sessionStorage.setItem("user", JSON.stringify(user));

      if (user.id) {
        safeLocalStorage.setItem(`profile_${user.id}`, JSON.stringify(user));
        safeLocalStorage.setItem("lastUserId", user.id);
      }

      // SYNC TO COOKIES: Ensure tokens are always in cookies after successful check
      if (typeof document !== 'undefined') {
        const currentToken = token || sessionStorage.getItem('accessToken');
        const currentRefresh = refreshToken || sessionStorage.getItem('refreshToken');

        if (currentToken) {
          const isLongLived = user.role === 'patient' || user.role === 'doctor';
          const accessMaxAge = isLongLived ? 604800 : 86400;
          document.cookie = `accessToken=${currentToken}; path=/; max-age=${accessMaxAge}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
        }

        if (currentRefresh) {
          document.cookie = `refreshToken=${currentRefresh}; path=/; max-age=604800; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
        }
      }

      set({ user: stabilizeUser(user), isAuthenticated: true, isLoading: false, isInitialized: true });
    } catch (error: any) {
      console.log("[Auth] Error during auth check:", error.message);

      // Check if it's a network error (backend unavailable)
      const isNetworkError =
        error?.isNetworkError ||
        error?.message?.includes("Cannot connect to server") ||
        error?.message?.includes("Failed to fetch") ||
        error?.message?.includes("Network error");

      // Check if it's an actual authentication error
      const isAuthError =
        error?.status === 401 ||
        error?.status === 403 ||
        error?.message?.includes("Session expired") ||
        error?.message?.includes("Unauthorized") ||
        error?.message?.includes("Not authenticated");

      if (isNetworkError) {
        // Backend unavailable - keep user logged in using cached data
        console.warn(
          "[Auth] ⚠️ Backend server unavailable. Using cached session data.",
        );

        // Try to restore user from localStorage
        const lastUserId = safeLocalStorage.getItem("lastUserId");
        const storedUser =
          sessionUser ||
          (lastUserId
            ? safeLocalStorage.getItem(`profile_${lastUserId}`)
            : null);

        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            console.log("[Auth] Restored user from cache:", {
              userId: user.id,
              role: user.role,
            });
            set({
              user: stabilizeUser(user),
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            });
            return;
          } catch (e) {
            console.error("[Auth] Failed to parse stored user:", e);
          }
        }

        // If no stored user but we have a token, assume authenticated but mark as initialized
        // This prevents redirect loop while backend is down
        console.log("[Auth] Keeping session active despite network error");
        set({ isLoading: false, isInitialized: true, isAuthenticated: true });
        return;
      }

      if (isAuthError) {
        // Actual auth failure - log out
        console.log(
          "[Auth] ❌ Authentication failed. Logging out current tab...",
        );
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("refreshToken");
        sessionStorage.removeItem("user");
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        // Other errors - keep user logged in but mark as initialized
        console.error("[Auth] Unexpected error during auth check:", error);
        // Try to use cached user if available
        const lastUserId = safeLocalStorage.getItem("lastUserId");
        const storedUser =
          sessionUser ||
          (lastUserId
            ? safeLocalStorage.getItem(`profile_${lastUserId}`)
            : null);

        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            console.log("[Auth] Using cached user due to unexpected error:", {
              userId: user.id,
              role: user.role,
            });
            set({
              user: stabilizeUser(user),
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            });
            return;
          } catch (e) {
            // Invalid stored user
          }
        }
        set({ isLoading: false, isInitialized: true });
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
