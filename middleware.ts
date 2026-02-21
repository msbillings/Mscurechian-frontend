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
  "/ambulance",
  "/about",
  "/features",
  "/pricing",
  "/solutions",
  "/coming-soon",
  "/portals",
  "/support",
  "/emergency-login",
  "/nurse-login",
  "/pharmacy/login",
  "/lab/login",
  "/hr/login",
];

const ROUTE_MAP: Record<string, string> = {
  staff: "/staff",
  doctor: "/doctor",
  "hospital-admin": "/hospital-admin",
  lab: "/lab/dashboard",
  "pharma-owner": "/pharmacy/dashboard",
  "super-admin": "/admin",
  admin: "/admin",
  helpdesk: "/helpdesk",
  nurse: "/nurse",
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

  const accessToken = request.cookies.get("accessToken")?.value;
  const hospitalIdCookie = request.cookies.get("hospitalId")?.value;

  // 2. DECODE ROLE IF TOKEN EXISTS
  const payload = accessToken ? decodeJwt(accessToken) : null;
  const userRole = payload?.role?.toLowerCase() || "";

  // 3. ENFORCE PATIENT PORTAL RESTRICTIONS
  // Patients should ONLY be on /patient paths. Others should be redirected AWAY.
  if (pathname.startsWith("/patient")) {
    if (!accessToken) {
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
    if (hospitalIdCookie && accessToken) {
      const redirectUrl = new URL(
        `/${hospitalIdCookie}${pathname}`,
        request.url,
      );
      redirectUrl.search = request.nextUrl.search;
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  // 6. TENANT-PREFIXED VALIDATION
  const pathParts = pathname.split("/").filter(Boolean);
  if (pathParts.length >= 1) {
    const firstSegment = pathParts[0];

    if (isValidHospitalId(firstSegment)) {
      if (!accessToken) {
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
      if (hospitalIdCookie && hospitalIdCookie !== firstSegment) {
        if (userRole !== "super-admin") {
          console.warn(
            `[Middleware] Tenant mismatch: path=${firstSegment}, cookie=${hospitalIdCookie}. Redirecting...`,
          );
          const remainingPath = "/" + pathParts.slice(1).join("/");
          return NextResponse.redirect(
            new URL(`/${hospitalIdCookie}${remainingPath}`, request.url),
          );
        }
      }

      const response = NextResponse.next();
      response.headers.set("X-Hospital-Id", firstSegment);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
