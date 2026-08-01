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

/**
 * Cleans doctor names by removing "Dr." prefixes.
 * Use this before saving to the database so we don't store redundant prefixes
 * when an honorific field is already present.
 */
export const cleanDoctorName = (name: string | null | undefined): string => {
  if (!name) return "";
  
  let cleaned = name.trim();
  // Clean up any double dots/multiple spaces anywhere in the name first
  cleaned = cleaned.replace(/\s*\.+\s*/g, " ").replace(/\s+/g, " ").trim();
  
  while (/^(dr|dr\.|dr\s+|dr\.\s+)/i.test(cleaned)) {
    cleaned = cleaned.replace(/^(dr|dr\.|dr\s+|dr\.\s+)/i, "").trim();
  }
  
  return cleaned;
};

/**
 * Formats doctor names to ensure they start with exactly one "Dr. " prefix.
 * Used for display purposes.
 */
export const formatDoctorName = (name: string | null | undefined): string => {
  const cleaned = cleanDoctorName(name);
  return cleaned ? `Dr. ${cleaned}` : "Doctor";
};

/**
 * Formats patient names with honorific prefix if available.
 */
export const formatPatientNameWithPrefix = (name: string | null | undefined, honorific: string | null | undefined): string => {
    const rawPatientName = name || "Unknown";
    const h = honorific || "";
    if (h) {
        const up = h.toUpperCase();
        const prefix = ["MR", "MRS", "MS", "DR"].includes(up) ? `${up}.` : up;
        return `${prefix} ${rawPatientName.toUpperCase()}`.trim();
    }
    return rawPatientName.toUpperCase();
};
