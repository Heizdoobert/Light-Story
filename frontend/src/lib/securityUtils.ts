/**
 * Sanitizes image URLs to prevent DOM text reinterpretation as HTML (DOM XSS).
 * Allows: blob:, http:, https:, data:image/*, and root-relative paths (/...).
 */
export function sanitizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith("//")) {
      return null;
    }
    if (trimmed.startsWith("/")) {
      return trimmed;
    }

    const parsed = new URL(trimmed, "https://sanitizer.local");

    if (parsed.protocol === "blob:") {
      return trimmed;
    }

    if (parsed.protocol === "data:") {
      return trimmed.toLowerCase().startsWith("data:image/") ? trimmed : null;
    }

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed;
    }

    return null;
  } catch {
    return null;
  }
}
