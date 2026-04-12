let apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (typeof window !== "undefined") {
  const currentHost = window.location.hostname;
  // 🌐 DYNAMIC NETWORK ADAPTER:
  // If the user is accessing the app via a network IP (e.g., from a mobile hotspot),
  // we automatically rewrite the API_URL to match the current host.
  // This avoids having to manually update .env files every time your IP changes.
  if (currentHost !== "localhost" && currentHost !== "127.0.0.1" && apiUrl) {
    try {
      const url = new URL(apiUrl);
      if (url.hostname !== currentHost) {
        console.warn(`[Config] 📶 Network access detected (${currentHost}). Dynamically switching API from ${url.hostname} to ${currentHost}`);
        url.hostname = currentHost;
        apiUrl = url.toString();
      }
    } catch (e) {
      // Fallback: if URL construction fails, do a simple regex replace if it's localhost
      if (apiUrl.includes("localhost")) {
        apiUrl = apiUrl.replace("localhost", currentHost);
      }
    }
  }
}

if (!apiUrl && typeof window !== "undefined") {
  console.error(
    "[Config] NEXT_PUBLIC_API_URL is not set! API calls will fail. " +
      "Set this env var and rebuild the app.",
  );
}

export const API_CONFIG = {
  // NEXT_PUBLIC_* vars are baked in at build time — set them on the SERVER before building.
  BASE_URL: apiUrl || "",
  WS_URL: apiUrl ? apiUrl.replace("/api", "").replace("http", "ws") : "", // Derive from API URL
  TIMEOUT: 10000,
};
