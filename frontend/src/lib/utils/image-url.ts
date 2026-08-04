export function getR2ImageUrl(
  url?: string | null,
  fallback = "/placeholder-cover.jpg",
): string {
  if (!url || url.trim() === "") return fallback;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("/")
  ) {
    return url;
  }
  const publicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
  if (publicDomain) {
    const cleanDomain = publicDomain.replace(/\/+$/, "");
    const cleanPath = url.replace(/^\/+/, "");
    return `${cleanDomain}/${cleanPath}`;
  }
  return `/api/r2/proxy?key=${encodeURIComponent(url)}`;
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
