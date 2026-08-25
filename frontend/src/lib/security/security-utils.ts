import { ROUTES } from "@/lib/constants/routes";

/**
 * Sanitizes image URLs to prevent DOM text reinterpretation as HTML (DOM XSS).
 * Allows: blob:, http:, https:, data:image/*, and root-relative paths (/...).
 */
export function sanitizeImageUrl(
  url: string | null | undefined,
): string | null {
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

    if (trimmed.startsWith("blob:")) {
      const isSafeBlob = /^blob:(https?:\/\/[^\/]+)\/.+$/i.test(trimmed);
      return isSafeBlob ? trimmed : null;
    }

    const parsed = new URL(trimmed, "https://sanitizer.local");

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

/**
 * Generates a local SVG fallback avatar based on the user's name.
 * This avoids external network requests which might be blocked by adblockers.
 */
export function getFallbackAvatar(name: string): string {
  const initial = (name || "U").charAt(0).toUpperCase();
  // Using a nice gradient background for the avatar
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#f97316;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#a855f7;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#grad)"/>
    <text x="50" y="50" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="bold" fill="#fff" text-anchor="middle" dominant-baseline="central">${initial}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\n/g, "").replace(/\s+/g, " "))}`;
}

/**
 * Proxies Supabase avatar URLs through a local API route to bypass adblockers
 * that blindly block any URL containing '/avatars/'.
 */
export function proxyAvatarUrl(url: string | null | undefined): string | null {
  const safeUrl = sanitizeImageUrl(url);
  if (!safeUrl) return null;

  // If it's a Supabase avatars bucket URL, proxy it!
  if (safeUrl.includes(".supabase.co/storage/v1/object/public/avatars/")) {
    return `${ROUTES.API.AVATAR}?url=${encodeURIComponent(safeUrl)}`;
  }

  return safeUrl;
}
