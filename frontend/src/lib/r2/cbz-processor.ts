import JSZip from "jszip";
import { uploadToR2 } from "./upload";
import { getErrorMessage } from "@/lib/utils/error-utils";

export interface CbzProgressCallback {
  (current: number, total: number, message: string): void;
}

export async function processCbzFile(
  file: File,
  folder: string = "chapters",
  onProgress?: CbzProgressCallback
): Promise<{ success: boolean; urls: string[]; failed: number; error?: string }> {
  try {
    onProgress?.(0, 0, "Đang đọc tập tin .cbz...");
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    const imageEntries: Array<{ name: string; entry: JSZip.JSZipObject }> = [];

    zipContent.forEach((relativePath, zipEntry) => {
      const fileName = relativePath.split("/").pop() || "";
      if (
        !zipEntry.dir &&
        !relativePath.includes("__MACOSX") &&
        !fileName.startsWith(".")
      ) {
        const ext = fileName.split(".").pop()?.toLowerCase();
        if (ext && ["jpg", "jpeg", "png", "webp", "avif", "gif"].includes(ext)) {
          imageEntries.push({ name: fileName, entry: zipEntry });
        }
      }
    });

    if (imageEntries.length === 0) {
      return {
        success: false,
        urls: [],
        failed: 0,
        error: "Tệp .cbz không chứa bất kỳ tệp hình ảnh hợp lệ nào.",
      };
    }

    // Natural sort by filename (e.g. 001.jpg, 002.jpg, 010.jpg)
    imageEntries.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );

    const uploadedUrls: string[] = [];
    let failedCount = 0;
    let lastError = "";
    const total = imageEntries.length;

    for (let i = 0; i < total; i++) {
      const { name, entry } = imageEntries[i];
      onProgress?.(i + 1, total, `Đang xử lý & tải lên R2 trang ${i + 1}/${total}...`);

      const rawExt = name.split(".").pop()?.toLowerCase() || "jpg";
      const mimeType = rawExt === "jpg" ? "image/jpeg" : `image/${rawExt}`;
      const blob = await entry.async("blob");
      
      const pageFile = new File([blob], `page_${String(i + 1).padStart(3, "0")}.${rawExt}`, {
        type: mimeType,
      });

      const res = await uploadToR2(pageFile, folder);
      if (res.success && res.url) {
        uploadedUrls.push(res.url);
      } else {
        failedCount += 1;
        lastError = res.error || "";
        console.warn(`Failed to upload page ${name}:`, res.error);
      }
    }

    return {
      success: uploadedUrls.length > 0,
      urls: uploadedUrls,
      failed: failedCount,
      error: failedCount > 0 ? `${failedCount}/${total} trang thất bại${lastError ? ` (${lastError})` : ""}` : undefined,
    };
  } catch (err) {
    console.error("Failed to process .cbz file:", err);
    return {
      success: false,
      urls: [],
      failed: 0,
      error: getErrorMessage(err) || "Lỗi giải nén tệp .cbz",
    };
  }
}
