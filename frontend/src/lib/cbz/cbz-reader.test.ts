import { describe, expect, it, vi } from "vitest";
import {
  isCbzUrl,
  isCbzFile,
  isImageFilename,
  naturalSortFilenames,
  revokeCbzPageUrls,
} from "./cbz-reader";

describe("cbzReader utility", () => {
  describe("isCbzUrl", () => {
    it("identifies cbz and zip URLs", () => {
      expect(isCbzUrl("https://example.com/chapter1.cbz")).toBe(true);
      expect(isCbzUrl("https://example.com/chapter1.zip?token=123")).toBe(true);
      expect(isCbzUrl("https://example.com/chapter1.cbr")).toBe(true);
      expect(isCbzUrl("https://example.com/image.png")).toBe(false);
      expect(isCbzUrl("")).toBe(false);
    });
  });

  describe("isCbzFile", () => {
    it("detects cbz and zip files", () => {
      const cbzFile = new File(["dummy"], "chapter.cbz", {
        type: "application/x-cbz",
      });
      const zipFile = new File(["dummy"], "chapter.zip", {
        type: "application/zip",
      });
      const imgFile = new File(["dummy"], "page.png", { type: "image/png" });

      expect(isCbzFile(cbzFile)).toBe(true);
      expect(isCbzFile(zipFile)).toBe(true);
      expect(isCbzFile(imgFile)).toBe(false);
    });
  });

  describe("isImageFilename", () => {
    it("accepts valid comic images and rejects system files", () => {
      expect(isImageFilename("page_001.jpg")).toBe(true);
      expect(isImageFilename("01.PNG")).toBe(true);
      expect(isImageFilename("cover.webp")).toBe(true);
      expect(isImageFilename("__MACOSX/._page_001.jpg")).toBe(false);
      expect(isImageFilename(".DS_Store")).toBe(false);
      expect(isImageFilename("info.txt")).toBe(false);
    });
  });

  describe("naturalSortFilenames", () => {
    it("sorts filenames numerically (1, 2, 10 instead of 1, 10, 2)", () => {
      const input = [
        { name: "page_10.jpg" },
        { name: "page_2.jpg" },
        { name: "page_1.jpg" },
        { name: "page_20.jpg" },
      ];
      const sorted = naturalSortFilenames(input, (item) => item.name);
      expect(sorted.map((s) => s.name)).toEqual([
        "page_1.jpg",
        "page_2.jpg",
        "page_10.jpg",
        "page_20.jpg",
      ]);
    });
  });

  describe("revokeCbzPageUrls", () => {
    it("revokes only blob URLs safely", () => {
      const revokeSpy = vi.fn();
      const originalRevoke = URL.revokeObjectURL;
      URL.revokeObjectURL = revokeSpy;

      try {
        const urls = [
          "blob:http://localhost:3000/uuid-1",
          "https://example.com/image.png",
          "blob:http://localhost:3000/uuid-2",
          "",
        ];

        revokeCbzPageUrls(urls);

        expect(revokeSpy).toHaveBeenCalledTimes(2);
        expect(revokeSpy).toHaveBeenCalledWith("blob:http://localhost:3000/uuid-1");
        expect(revokeSpy).toHaveBeenCalledWith("blob:http://localhost:3000/uuid-2");
      } finally {
        URL.revokeObjectURL = originalRevoke;
      }
    });

    it("handles invalid or empty inputs without throwing", () => {
      expect(() => revokeCbzPageUrls([] as any)).not.toThrow();
      expect(() => revokeCbzPageUrls(null as any)).not.toThrow();
      expect(() => revokeCbzPageUrls(undefined as any)).not.toThrow();
    });
  });
});
