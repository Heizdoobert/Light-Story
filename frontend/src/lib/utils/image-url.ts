import { ROUTES } from "@/lib/constants/routes";

const COVER_FALLBACK_URL = "https://placehold.co/400x600/png?text=No+Cover";

export function applyComicCoverFallback(
  event: React.SyntheticEvent<HTMLImageElement>,
): void {
  if (event.currentTarget.src !== COVER_FALLBACK_URL)
    event.currentTarget.src = COVER_FALLBACK_URL;
}

export function resolveR2Url(keyOrUrl: string): string {
  if (
    keyOrUrl.startsWith("http://") ||
    keyOrUrl.startsWith("https://") ||
    keyOrUrl.startsWith("/")
  ) {
    return keyOrUrl;
  }
  const publicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
  if (publicDomain) {
    const cleanDomain = publicDomain.replace(/\/+$/, "");
    const cleanPath = keyOrUrl.replace(/^\/+/, "");
    return `${cleanDomain}/${cleanPath}`;
  }
  return `${ROUTES.API.R2_PROXY}?key=${encodeURIComponent(keyOrUrl)}`;
}

export function getR2ImageUrl(
  url?: string | null,
  fallback = ROUTES.PLACEHOLDER_COVER,
): string {
  if (!url || url.trim() === "") return fallback;
  return resolveR2Url(url);
}

export function formatImageWithCacheBuster(
  url: string,
  version?: string | number,
): string {
  if (!url) return url;
  const delimiter = url.includes("?") ? "&" : "?";
  const v = version || Date.now();
  return `${url}${delimiter}v=${v}`;
}