/**
 * Sanitizes patient names by filtering out debug placeholders and providing safe fallbacks.
 * This prevents internal debug strings (like "debug", "Unknown", etc.) from being
 * displayed to the end-user as the primary name.
 */
export const sanitizePatientName = (name: string | null | undefined, fallback: string = "Unnamed Patient"): string => {
  if (!name) return fallback;
  
  const lowerName = name.trim().toLowerCase();
  const debugPlaceholders = [
    "debug",
    "unknown",
    "unknown patient",
    "unnamed",
    "unnamed patient",
    "placeholder",
    "test patient",
    "test"
  ];

  if (debugPlaceholders.includes(lowerName)) {
    return fallback;
  }

  return name;
};
