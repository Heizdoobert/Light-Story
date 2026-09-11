import { isCbzUrl } from "@/lib/cbz/cbz-reader";

export interface ParsedChapterContent {
  imageUrls: string[];
  isCbz: boolean;
  cbzUrl: string | null;
}

export function parseChapterContent(content: unknown): ParsedChapterContent {
  let imageUrls: string[] = [];

  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        imageUrls = parsed;
      } else {
        imageUrls = content.split(",").map((s: string) => s.trim());
      }
    } catch {
      imageUrls = content.split(",").map((s: string) => s.trim());
    }
  } else if (Array.isArray(content)) {
    imageUrls = content;
  }

  const cleanUrls = imageUrls.filter(
    (u): u is string => typeof u === "string" && u.length > 0,
  );
  const cbzFromList = cleanUrls.find(isCbzUrl) ?? null;
  const bareCbz = typeof content === "string" && isCbzUrl(content) ? content : null;
  const cbzUrl = cbzFromList ?? bareCbz;

  return {
    imageUrls: cleanUrls,
    isCbz: cbzUrl !== null,
    cbzUrl,
  };
}
