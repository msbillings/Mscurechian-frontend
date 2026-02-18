import type { NextConfig } from "next";

/**
 * MongoDB ObjectId pattern: exactly 24 hex characters
 * Used to identify tenant-prefixed routes like /{hospitalId}/doctor
 */
const HOSPITAL_ID_PATTERN =
  ":hospitalId([a-f0-9]{24}|[a-z0-9][a-z0-9-]{2,58}[a-z0-9])";

const nextConfig: NextConfig = {
  // ✅ Enable React Compiler for better performance
  experimental: {
    reactCompiler: true,
    optimizePackageImports: ["lucide-react", "recharts"], // Only import what's used
  },

  // ✅ Production optimizations
  compress: true, // Enable gzip compression

  // ✅ Image optimization
  images: {
    formats: ["image/webp", "image/avif"], // Modern image formats
    minimumCacheTTL: 60, // Cache images for 60 seconds
    deviceSizes: [640, 750, 828, 1080, 1200, 1920], // Responsive breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ✅ Better build output
  productionBrowserSourceMaps: false, // Disable source maps in production

  // ✅ Strict mode for better error detection
  reactStrictMode: true,

  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },

  /**
   * ✅ MULTI-TENANCY: URL Rewrites
   *
   * Maps tenant-prefixed portal paths to existing portal routes.
   * The hospitalId stays in the URL (for context) but the actual page served
   * is the existing portal page.
   *
   * Example:
   *   /abc123.../doctor/patients → /doctor/patients (served)
   *   URL remains: /abc123.../doctor/patients (for tenant context)
   *
   * This means:
   * - useParams() returns { hospitalId: 'abc123...' } in all portal components
   * - apiClient.ts reads hospitalId from URL → sets X-Hospital-Id header
   * - Backend scopes all queries to that hospital
   */
  async rewrites() {
    return [
      // Doctor Portal
      {
        source: `/${HOSPITAL_ID_PATTERN}/doctor`,
        destination: "/doctor",
      },
      {
        source: `/${HOSPITAL_ID_PATTERN}/doctor/:path*`,
        destination: "/doctor/:path*",
      },
      // Hospital Admin Portal
      {
        source: `/${HOSPITAL_ID_PATTERN}/hospital-admin`,
        destination: "/hospital-admin",
      },
      {
        source: `/${HOSPITAL_ID_PATTERN}/hospital-admin/:path*`,
        destination: "/hospital-admin/:path*",
      },
      // Helpdesk Portal
      {
        source: `/${HOSPITAL_ID_PATTERN}/helpdesk`,
        destination: "/helpdesk",
      },
      {
        source: `/${HOSPITAL_ID_PATTERN}/helpdesk/:path*`,
        destination: "/helpdesk/:path*",
      },
      // Lab Portal
      {
        source: `/${HOSPITAL_ID_PATTERN}/lab`,
        destination: "/lab",
      },
      {
        source: `/${HOSPITAL_ID_PATTERN}/lab/:path*`,
        destination: "/lab/:path*",
      },
      // Pharmacy Portal
      {
        source: `/${HOSPITAL_ID_PATTERN}/pharmacy`,
        destination: "/pharmacy",
      },
      {
        source: `/${HOSPITAL_ID_PATTERN}/pharmacy/:path*`,
        destination: "/pharmacy/:path*",
      },
      // Nurse Portal
      {
        source: `/${HOSPITAL_ID_PATTERN}/nurse`,
        destination: "/nurse",
      },
      {
        source: `/${HOSPITAL_ID_PATTERN}/nurse/:path*`,
        destination: "/nurse/:path*",
      },
      // Staff Portal
      {
        source: `/${HOSPITAL_ID_PATTERN}/staff`,
        destination: "/staff",
      },
      {
        source: `/${HOSPITAL_ID_PATTERN}/staff/:path*`,
        destination: "/staff/:path*",
      },
      // Discharge Portal
      {
        source: `/${HOSPITAL_ID_PATTERN}/discharge`,
        destination: "/discharge",
      },
      {
        source: `/${HOSPITAL_ID_PATTERN}/discharge/:path*`,
        destination: "/discharge/:path*",
      },
    ];
  },
};

export default nextConfig;
