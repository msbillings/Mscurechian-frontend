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
  "/discharge",
  "/emergency",
  "/patient-portal",
];

// Paths that are completely public / don't need tenant context
const PUBLIC_PATHS = [
  "/auth",
  "/admin",
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
  "/patient",
  "/_next",
  "/favicon",
  "/api",
];

/**
 * Validate if a string looks like a MongoDB ObjectId (24 hex chars)
 * or a hospital slug (alphanumeric with hyphens, 3-60 chars)
 */
function isValidHospitalId(segment: string): boolean {
  if (!segment) return false;
  // MongoDB ObjectId: exactly 24 hex characters
  if (/^[a-f0-9]{24}$/i.test(segment)) return true;
  // Hospital slug: alphanumeric with hyphens
  if (/^[a-z0-9][a-z0-9-]{2,58}[a-z0-9]$/i.test(segment)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, Next.js internals, and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check if path starts with a public path — let it through
  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (isPublicPath) {
    return NextResponse.next();
  }

  const hospitalIdCookie = request.cookies.get("hospitalId");
  const accessToken = request.cookies.get("accessToken");

  // Check if this is a legacy portal path (without hospitalId prefix)
  const isLegacyPortalPath = PORTAL_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (isLegacyPortalPath) {
    // If user has a hospitalId cookie, redirect to tenant-prefixed path
    if (hospitalIdCookie?.value && accessToken?.value) {
      const tenantId = hospitalIdCookie.value;
      const redirectUrl = new URL(`/${tenantId}${pathname}`, request.url);
      redirectUrl.search = request.nextUrl.search;
      return NextResponse.redirect(redirectUrl);
    }
    // No hospitalId cookie — will likely be caught by page-level auth or just pass
    return NextResponse.next();
  }

  // Check if this is a tenant-prefixed path (/{hospitalId}/...)
  const pathParts = pathname.split("/").filter(Boolean);
  if (pathParts.length >= 1) {
    const firstSegment = pathParts[0];

    if (isValidHospitalId(firstSegment)) {
      if (!accessToken?.value) {
        // Not authenticated — redirect to login
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      // 🚨 STRICT ENFORCEMENT: Check if path hospital matches cookie hospital
      // Skip this check for SuperAdmins (we'd need to decode JWT to be sure,
      // but for now we trust the cookie which is set on login)
      if (hospitalIdCookie?.value && hospitalIdCookie.value !== firstSegment) {
        console.warn(
          `[Middleware] Tenant mismatch: path=${firstSegment}, cookie=${hospitalIdCookie.value}. Redirecting...`,
        );

        // Redirect to the correct portal based on their actual hospitalId
        const remainingPath = "/" + pathParts.slice(1).join("/");
        const redirectUrl = new URL(
          `/${hospitalIdCookie.value}${remainingPath}`,
          request.url,
        );
        return NextResponse.redirect(redirectUrl);
      }

      // Authenticated — pass through and set X-Hospital-Id header
      const response = NextResponse.next();
      response.headers.set("X-Hospital-Id", firstSegment);
      return response;
    }
  }

  // Default: pass through
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
