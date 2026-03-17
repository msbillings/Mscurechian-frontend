import { NextRequest, NextResponse } from "next/server";

/**
 * MULTI-TENANT MIDDLEWARE
 *
 * Handles two scenarios:
 * 1. Legacy portal paths (/doctor, /hospital-admin, etc.) → redirect to /{hospitalId}/doctor
 * 2. Tenant-prefixed paths (/{hospitalId}/doctor) → validate and pass through
 *
 * SuperAdmin paths (/admin) are NOT tenant-prefixed — they have global access.
 */

// Portal paths that require tenant context
const PORTAL_PATHS = [
  "/doctor",
  "/hospital-admin",
  "/helpdesk",
  "/lab",
  "/pharmacy",
  "/nurse",
  "/staff",
  "/hr",
  "/emergency",
];

// Paths that are completely public / don't need tenant context
const PUBLIC_PATHS = [
  "/auth",
  "/admin",
  "/patient", // Added back to prevent it being treated as a hospitalId
  "/about",
  "/blogs",
  "/features",
  "/pricing",
  "/solutions",
  "/coming-soon",
  "/portals",
  "/support",
  "/emergency-login",
  "/nurse/login",
  "/pharmacy/login",
  "/lab/login",
  "/hr/login",
];

const ROUTE_MAP: Record<string, string> = {
  staff: "/staff",
  doctor: "/doctor",
  "hospital-admin": "/hospital-admin",
  lab: "/lab/dashboard",
  "pharma": "/pharmacy/dashboard",
  "pharma-owner": "/pharmacy/dashboard",
  "pharmacist": "/pharmacy/dashboard",
  "super-admin": "/admin",
  admin: "/admin",
  helpdesk: "/helpdesk",
  nurse: "/nurse",
  frontdesk: "/frontdesk",
  hr: "/hr",
  emergency: "/ambulance",
  discharge: "/discharge",
};

/**
 * Robust JWT payload decoding for Edge Runtime
 */
function decodeJwt(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    let payload = parts[1];
    // Replace URL-safe characters
    payload = payload.replace(/-/g, "+").replace(/_/g, "/");

    // Add padding if missing
    const pad = payload.length % 4;
    if (pad) {
      if (pad === 1) return null;
      payload += new Array(5 - pad).join("=");
    }

    return JSON.parse(atob(payload));
  } catch (e) {
    console.error("[Middleware] JWT Decode Error:", e);
    return null;
  }
}

/**
 * Validate if a string looks like a MongoDB ObjectId (24 hex chars)
 * or a hospital slug (alphanumeric with hyphens, 3-60 chars)
 */
function isValidHospitalId(segment: string): boolean {
  if (!segment) return false;

  // EXCLUDE RESERVED ROOT PATHS
  const reserved = [
    "patient",
    "auth",
    "admin",
    "ambulance",
    "about",
    "blogs",
    "features",
    "pricing",
    "solutions",
    "coming-soon",
    "portals",
    "support",
    "api",
    "favicon",
    "doctor",
    "lab",
    "pharmacy",
    "staff",
    "nurse",
    "helpdesk",
    "hr",
  ];
  if (reserved.includes(segment.toLowerCase())) return false;

  // MongoDB ObjectId: exactly 24 hex characters
  if (/^[a-f0-9]{24}$/i.test(segment)) return true;
  // Hospital slug: alphanumeric with hyphens
  if (/^[a-z0-9][a-z0-9-]{2,58}[a-z0-9]$/i.test(segment)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. SKIP STATIC FILES & API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // 1.5 IDENTIFY TENANT FROM PATH OR COOKIE
  const pathParts = pathname.split("/").filter(Boolean);
  const pathHospitalId = pathParts.length >= 1 && isValidHospitalId(pathParts[0]) ? pathParts[0] : "";
  const cookieHospitalId = request.cookies.get("hospitalId")?.value || "";
  
  // Use path context first, fallback to cookie for discovery on global routes (like /ambulance)
  const effectiveId = pathHospitalId || cookieHospitalId;


  // 2. RESOLVE ACCESS TOKEN (Multi-tenant aware)
  // 🚨 CRITICAL: We prioritize namespaced cookies. If a hospital context is present,
  // we MUST NOT fallback to a global cookie to prevent cross-tab session leakage.
  const atName = effectiveId ? `accessToken_${effectiveId}` : "accessToken";
  const rtName = effectiveId ? `refreshToken_${effectiveId}` : "refreshToken";

  let accessToken = request.cookies.get(atName)?.value || "";
  let refreshToken = request.cookies.get(rtName)?.value || "";

  // Only fallback to global if NO hospital context exists (global dashboard discovery)
  if (!effectiveId && !accessToken) {
     accessToken = request.cookies.get("accessToken")?.value || "";
     refreshToken = request.cookies.get("refreshToken")?.value || "";
  }
  
  let currentSessionId = "";

  if (accessToken) {
    const payload = decodeJwt(accessToken);
    currentSessionId = payload?.sessionId || "";
  } else if (refreshToken) {
    const payload = decodeJwt(refreshToken);
    currentSessionId = payload?.sessionId || "";
  }

  const payload = accessToken ? decodeJwt(accessToken) : null;
  const userRole = payload?.role?.toLowerCase() || "";
  const userHospitalId = payload?.hospitalId || payload?.hospital;

  // ✅ DEBUG LOGGING
  if (pathname.includes("/admin") || pathname.includes("/doctor") || pathname.includes("/hospital-admin") || pathname.includes("/auth")) {
    console.log(`[Middleware] 📋 Path: ${pathname} | Token: ${!!accessToken} | Session: ${currentSessionId} | Role: ${userRole} | Hosp: ${userHospitalId}`);
  }

  // 3. ENFORCE PATIENT PORTAL RESTRICTIONS
  // Patients should ONLY be on /patient paths. Others should be redirected AWAY.
  if (pathname.startsWith("/patient")) {
    if (!accessToken && !currentSessionId) {
      console.log(`[Middleware] 🔐 Redirect to Login (Patient Path): No Token/Session`);
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (userRole && userRole !== "patient" && userRole !== "super-admin") {
      console.log(
        `[Middleware] Non-patient user (${userRole}) on patient path. Redirecting...`,
      );
      const targetPortal = ROUTE_MAP[userRole] || "/auth/login";
      return NextResponse.redirect(new URL(targetPortal, request.url));
    }
  }

  // 4. PUBLIC PATHS BYPASS
  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 5. LEGACY PORTAL REDIRECTION
  const isLegacyPortalPath = PORTAL_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (isLegacyPortalPath) {
    if (userHospitalId && accessToken) {
      const redirectUrl = new URL(
        `/${userHospitalId}${pathname}`,
        request.url,
      );
      redirectUrl.search = request.nextUrl.search;
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  // 6. TENANT-PREFIXED VALIDATION
  if (pathParts.length >= 1) {
    const firstSegment = pathParts[0];

    if (isValidHospitalId(firstSegment)) {
      // 🚨 PORTAL REDIRECT: If user visits /[hospitalId]/dashboard or /[hospitalId]/portals,
      // redirect them specifically to their role's portal.
      if (
        (pathParts.length === 2 && (pathParts[1] === "dashboard" || pathParts[1] === "portals")) ||
        pathParts.length === 1
      ) {
        if (userRole && userRole !== "patient") {
          const portalBase = ROUTE_MAP[userRole] || "/hospital-admin";
          const target = portalBase.startsWith("/") ? portalBase : `/${portalBase}`;
          
          // If the target is already absolute (like /admin), don't prefix with hospitalId
          const isGlobalPortal = ["/admin", "/patient/dashboard", "/ambulance"].includes(target);
          const finalRedirect = isGlobalPortal ? target : `/${firstSegment}${target}`;
          
          console.log(`[Middleware] 🧭 Routing user ${userRole} from ${pathname} to ${finalRedirect}`);
          return NextResponse.redirect(new URL(finalRedirect, request.url));
        }
      }

      if (!accessToken && !currentSessionId) {
        console.log(`[Middleware] 🔐 Redirect to Login (Tenant Path): No Token/Session`);
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      // 🚨 FAST PATH: Patients should ALWAYS be on the global root dashboard. No tenant prefix allowed.
      if (userRole === "patient") {
        console.log(
          `[Middleware] Patient on tenant path ${pathname}. Redirecting to global...`,
        );
        return NextResponse.redirect(
          new URL("/patient/dashboard", request.url),
        );
      }

      // 🚨 TENANT MISMATCH PROTECTION
      // Note: We use the hospitalId from the path primarily now.
      // If the user has a specific hospitalId in their token, we could validate it here.
      const userHospitalId = payload?.hospitalId || payload?.hospital;
      
      if (userHospitalId && userHospitalId !== firstSegment && userRole !== "super-admin") {
        console.warn(
          `[Middleware] Tenant mismatch: path=${firstSegment}, token=${userHospitalId}. Redirecting...`,
        );
        const remainingPath = "/" + pathParts.slice(1).join("/");
        return NextResponse.redirect(
          new URL(`/${userHospitalId}${remainingPath}`, request.url),
        );
      }

      // Build response and sync hospital context to headers for apiServer
      const response = NextResponse.next({
        request: {
          headers: new Headers(request.headers),
        },
      });
      
      response.headers.set("X-Hospital-Id", firstSegment);
      // Also set on the request so the current rendering cycle can see it via next/headers
      response.headers.set("x-hospital-id", firstSegment); 
      // Note: NextResponse.next with request headers is the way to pass headers to downstream server components in Next.js 13+
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("X-Hospital-Id", firstSegment);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
