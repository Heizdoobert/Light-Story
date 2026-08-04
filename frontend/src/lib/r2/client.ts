import { getR2ImageUrl } from "@/lib/utils/image-url";

export function getR2PublicUrl(key: string): string {
  if (!key) return "";
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  const baseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanKey = key.replace(/^\/+/, "");
  return cleanBase
    ? `${cleanBase}/${cleanKey}`
    : `/api/r2/proxy?key=${encodeURIComponent(key)}`;
}

export { getR2ImageUrl };
