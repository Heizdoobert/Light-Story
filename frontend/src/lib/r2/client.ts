import { getR2ImageUrl, resolveR2Url } from "@/lib/utils/image-url";

export function getR2PublicUrl(key: string): string {
  if (!key) return "";
  return resolveR2Url(key);
}

export { getR2ImageUrl };