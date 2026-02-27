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
    // ✅ Increase Server Actions body size limit (for profile uploads, etc.)
    serverActions: {
      bodySizeLimit: "5mb",
    },
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

  // Rewrites removed - using physical [hospitalId] directory structure
};

export default nextConfig;
