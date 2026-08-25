import { describe, expect, it } from "vitest";
import { cbzBasename, isCbzOrZipFile } from "./cbz-name";

describe("cbzName utility", () => {
  describe("cbzBasename", () => {
    it("strips .cbz and .zip extensions", () => {
      expect(cbzBasename("chapter1.cbz")).toBe("chapter1");
      expect(cbzBasename("chapter 2.zip")).toBe("chapter 2");
    });

    it("handles uppercase extensions", () => {
      expect(cbzBasename("VOL1.CBZ")).toBe("VOL1");
      expect(cbzBasename("vol2.Zip")).toBe("vol2");
    });

    it("leaves non-archive names unchanged and trims whitespace", () => {
      expect(cbzBasename("cover.png")).toBe("cover.png");
      expect(cbzBasename("  chapter 3  ")).toBe("chapter 3");
    });

    it("returns empty string for a hidden extension-only name", () => {
      expect(cbzBasename(".cbz")).toBe("");
    });
  });

  describe("isCbzOrZipFile", () => {
    it("detects cbz/zip by name regardless of case", () => {
      expect(isCbzOrZipFile({ name: "a.cbz", type: "application/octet-stream" })).toBe(true);
      expect(isCbzOrZipFile({ name: "A.CBZ", type: "application/octet-stream" })).toBe(true);
      expect(isCbzOrZipFile({ name: "a.ZIP", type: "application/octet-stream" })).toBe(true);
      expect(isCbzOrZipFile({ name: "page.png", type: "image/png" })).toBe(false);
    });

    it("detects by mime type when extension is unusual", () => {
      expect(isCbzOrZipFile({ name: "book", type: "application/x-cbz" })).toBe(true);
      expect(isCbzOrZipFile({ name: "book", type: "application/zip" })).toBe(true);
    });
  });
});
