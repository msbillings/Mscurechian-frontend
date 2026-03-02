const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl && typeof window !== "undefined") {
  console.error(
    "[Config] NEXT_PUBLIC_API_URL is not set! API calls will fail. " +
      "Set this env var and rebuild the app.",
  );
}

export const API_CONFIG = {
  // NEXT_PUBLIC_* vars are baked in at build time — set them on the SERVER before building.
  // Local dev:   http://localhost:3000/api/proxy  (Next.js proxy → localhost:5002)
  // Production:  http://43.204.32.80/api/proxy    (Next.js proxy → localhost:5002 on same server)
  BASE_URL: apiUrl || "",
  TIMEOUT: 10000,
};
