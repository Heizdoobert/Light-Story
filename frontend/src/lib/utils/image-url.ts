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
  return `/api/r2/proxy?key=${encodeURIComponent(keyOrUrl)}`;
}

export function getR2ImageUrl(
  url?: string | null,
  fallback = "/placeholder-cover.jpg",
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