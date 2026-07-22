import JSZip from "jszip";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];

export function isCbzUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return clean.endsWith(".cbz") || clean.endsWith(".zip") || clean.endsWith(".cbr");
}

export function isCbzFile(file: File): boolean {
  if (!file) return false;
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".cbz") ||
    name.endsWith(".zip") ||
    name.endsWith(".cbr") ||
    file.type === "application/x-cbz" ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed"
  );
}

function getMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".avif")) return "image/avif";
  return "image/jpeg";
}

export function isImageFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  if (lower.includes("__macosx") || lower.startsWith(".") || lower.includes("/.")) {
    return false;
  }
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function naturalSortFilenames<T>(items: T[], getFilename: (item: T) => string): T[] {
  return [...items].sort((a, b) =>
    getFilename(a).localeCompare(getFilename(b), undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
}

export async function loadCbzPagesFromUrl(url: string): Promise<string[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download CBZ archive: HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const imageEntries: { name: string; entry: JSZip.JSZipObject }[] = [];
  zip.forEach((relativePath, entry) => {
    if (!entry.dir && isImageFilename(relativePath)) {
      imageEntries.push({ name: relativePath, entry });
    }
  });

  const sorted = naturalSortFilenames(imageEntries, (item) => item.name);
  const blobUrls: string[] = [];

  for (const item of sorted) {
    const mime = getMimeType(item.name);
    const blobData = await item.entry.async("blob");
    const imageBlob = new Blob([blobData], { type: mime });
    blobUrls.push(URL.createObjectURL(imageBlob));
  }

  return blobUrls;
}

export async function extractCbzFileToImages(file: File): Promise<File[]> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const imageEntries: { name: string; entry: JSZip.JSZipObject }[] = [];
  zip.forEach((relativePath, entry) => {
    if (!entry.dir && isImageFilename(relativePath)) {
      imageEntries.push({ name: relativePath, entry });
    }
  });

  const sorted = naturalSortFilenames(imageEntries, (item) => item.name);
  const extractedFiles: File[] = [];

  for (const item of sorted) {
    const mime = getMimeType(item.name);
    const blobData = await item.entry.async("blob");
    const cleanName = item.name.split("/").pop() || item.name;
    const extractedFile = new File([blobData], cleanName, { type: mime });
    extractedFiles.push(extractedFile);
  }

  return extractedFiles;
}
