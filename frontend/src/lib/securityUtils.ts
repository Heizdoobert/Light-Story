/**
 * Sanitizes image URLs to prevent DOM text reinterpretation as HTML (DOM XSS).
 * Only allows safe schemes: http://, https://, blob:, data:image/, and relative paths (/).
 */
export function sanitizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  
  if (
    lower.startsWith("https://") ||
    lower.startsWith("http://") ||
    lower.startsWith("blob:") ||
    lower.startsWith("data:image/") ||
    (lower.startsWith("/") && !lower.startsWith("//"))
  ) {
    return trimmed;
  }
  
  return null;
}
