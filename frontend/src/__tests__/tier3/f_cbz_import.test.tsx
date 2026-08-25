import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import JSZip from "jszip";
import {
  CBZ_LIMITS,
  CbzImportError,
  chapterTitleFromNumber,
  extractCbzImages,
  fetchExistingChapterNumbers,
  parseChapterNumberFromFilename,
  trackPageUpload,
  uploadChapterPage,
} from "@/lib/r2/cbz-import";
import { useCbzBatchImport } from "@/hooks/features/use-cbz-batch-import";

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock("@/services/comics/comic.service", () => ({
  getAccessToken: async () => "test-token",
}));

async function makeCbz(files: Record<string, string | Uint8Array>): Promise<File> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) zip.file(name, content);
  const blob = await zip.generateAsync({ type: "blob" });
  return new File([blob], "chapter-1.cbz", { type: "application/x-cbz" });
}

const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

describe("cbz-import lib", () => {
  describe("parseChapterNumberFromFilename", () => {
    it("parses digits from filename", () => {
      expect(parseChapterNumberFromFilename("chapter-05.cbz")).toBe(5);
      expect(parseChapterNumberFromFilename("Chapter 10.cbz")).toBe(10);
      expect(parseChapterNumberFromFilename("ch123_v2.cbz")).toBe(123);
    });

    it("rejects filenames without numbers or zero", () => {
      expect(parseChapterNumberFromFilename("random.cbz")).toBeNull();
      expect(parseChapterNumberFromFilename("chapter-0.cbz")).toBeNull();
    });
  });

  it("titles chapters as 'chapter {n}'", () => {
    expect(chapterTitleFromNumber(5)).toBe("chapter 5");
    expect(chapterTitleFromNumber(100)).toBe("chapter 100");
  });

  describe("extractCbzImages", () => {
    it("filters, sorts naturally, and skips __MACOSX/dotfiles", async () => {
      const file = await makeCbz({
        "page 10.jpg": PNG_BYTES,
        "page 2.jpg": PNG_BYTES,
        "page 1.jpg": PNG_BYTES,
        "__MACOSX/page 3.jpg": PNG_BYTES,
        ".hidden.png": PNG_BYTES,
        "notes.txt": "not an image",
      });
      const images = await extractCbzImages(file);
      expect(images.map((i) => i.name)).toEqual(["page 1.jpg", "page 2.jpg", "page 10.jpg"]);
    });

    it("rejects empty archives", async () => {
      const file = await makeCbz({ "readme.txt": "no images" });
      await expect(extractCbzImages(file)).rejects.toThrow(CbzImportError);
      await expect(extractCbzImages(file)).rejects.toMatchObject({ code: "EMPTY" });
    });

    it("rejects too many pages", async () => {
      const files: Record<string, Uint8Array> = {};
      for (let i = 1; i <= CBZ_LIMITS.maxPages + 1; i++) files[`p${String(i).padStart(4, "0")}.jpg`] = PNG_BYTES;
      const file = await makeCbz(files);
      await expect(extractCbzImages(file)).rejects.toMatchObject({ code: "TOO_MANY_PAGES" });
    });

    it("rejects oversized files", async () => {
      const file = await makeCbz({ "1.jpg": PNG_BYTES });
      Object.defineProperty(file, "size", { value: (CBZ_LIMITS.maxFileMB + 1) * 1024 * 1024 });
      await expect(extractCbzImages(file)).rejects.toMatchObject({ code: "TOO_LARGE" });
    });
  });

  it("tracks page upload usage counters", () => {
    localStorage.clear();
    const first = trackPageUpload();
    const second = trackPageUpload(3);
    expect(second.dayCount).toBe(first.dayCount + 3);
    expect(second.monthCount).toBe(second.dayCount);
  });

  describe("uploadChapterPage", () => {
    const page = () => new File(["x"], "p.jpg", { type: "image/jpeg" });
    const opts = { comicId: "c1", chapterNumber: 1, pageNumber: 1 };

    it("retries once on 429, honoring retry-after, then succeeds", async () => {
      const mock = vi
        .fn()
        .mockResolvedValueOnce(new Response("{}", { status: 429, headers: { "retry-after": "0" } }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true, data: { urls: ["/api/media/p"] } }), { status: 200 }),
        );
      vi.stubGlobal("fetch", mock);
      const url = await uploadChapterPage(page(), opts);
      expect(url).toBe("/api/media/p");
      expect(mock).toHaveBeenCalledTimes(2);
    });

    it("fails with HTTP 429 when the rate limit persists", async () => {
      const mock = vi.fn().mockResolvedValue(new Response("{}", { status: 429, headers: { "retry-after": "0" } }));
      vi.stubGlobal("fetch", mock);
      await expect(uploadChapterPage(page(), opts)).rejects.toThrow("HTTP 429");
      expect(mock).toHaveBeenCalledTimes(2);
    });

    it("retries once on network error, then succeeds", async () => {
      const mock = vi
        .fn()
        .mockRejectedValueOnce(new TypeError("network down"))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true, data: { urls: ["/api/media/p"] } }), { status: 200 }),
        );
      vi.stubGlobal("fetch", mock);
      const url = await uploadChapterPage(page(), opts);
      expect(url).toBe("/api/media/p");
      expect(mock).toHaveBeenCalledTimes(2);
    });

    it("does not retry 4xx/5xx errors other than 429", async () => {
      const mock = vi.fn().mockResolvedValue(new Response("{}", { status: 500 }));
      vi.stubGlobal("fetch", mock);
      await expect(uploadChapterPage(page(), opts)).rejects.toThrow("HTTP 500");
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe("fetchExistingChapterNumbers", () => {
    it("parses the { success, data } envelope", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ success: true, data: [{ chapter_number: 3 }, { chapter_number: 107 }] }), {
            status: 200,
          }),
        ),
      );
      const set = await fetchExistingChapterNumbers("comic-1");
      expect([...set]).toEqual([3, 107]);
    });

    it("parses a bare array shape", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(JSON.stringify([{ chapter_number: 5 }]), { status: 200 })),
      );
      const set = await fetchExistingChapterNumbers("comic-1");
      expect([...set]).toEqual([5]);
    });

    it("returns an empty set for no rows and throws on non-ok", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: [] }), { status: 200 })));
      expect((await fetchExistingChapterNumbers("comic-1")).size).toBe(0);
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
      await expect(fetchExistingChapterNumbers("comic-1")).rejects.toThrow("HTTP 401");
    });
  });
});

describe("useCbzBatchImport", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("imports one chapter end-to-end and skips duplicates/no-number files", async () => {
    const cbzFile = await makeCbz({ "001.jpg": PNG_BYTES, "002.jpg": PNG_BYTES });

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/chapters") && !url.includes("upload")) {
        return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (url.includes("upload")) {
        return new Response(JSON.stringify({ success: true, data: { urls: [`/api/media/pages/${Date.now()}`] } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCbzBatchImport("comic-1"));

    await act(async () => {
      await result.current.selectFiles([
        cbzFile,
        new File([new Blob()], "chapter-1-dup.cbz"),
        new File([new Blob()], "no-number.cbz"),
      ]);
    });

    expect(result.current.rows[0].chapterNumber).toBe(1);
    expect(result.current.rows[0].status).toBe("queued");
    expect(result.current.rows[1].status).toBe("skipped"); // duplicate number
    expect(result.current.rows[2].status).toBe("skipped"); // no number

    await act(async () => {
      await result.current.run();
    });

    await waitFor(() => expect(result.current.rows[0].status).toBe("done"));
    expect(result.current.rows[0].replacesExisting).toBe(false);
    // 2 page uploads + 1 preflight + 1 upsert
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("cancel marks in-flight and queued rows canceled and stops the run", async () => {
    const hang = new Promise<Response>(() => {});
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/chapters") && !url.includes("upload")) {
        return new Response(JSON.stringify({ success: true, data: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return hang; // uploads never resolve → run stays in-flight
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCbzBatchImport("comic-1"));
    const f1 = await makeCbz({ "001.jpg": PNG_BYTES });
    const f2 = await makeCbz({ "001.jpg": PNG_BYTES });
    await act(async () => {
      await result.current.selectFiles([
        new File([await f1.arrayBuffer()], "chapter-1.cbz", { type: "application/x-cbz" }),
        new File([await f2.arrayBuffer()], "chapter-2.cbz", { type: "application/x-cbz" }),
      ]);
    });

    act(() => {
      void result.current.run();
    });
    await waitFor(() => expect(result.current.rows[0].status).toBe("uploading"));
    act(() => {
      result.current.cancel();
    });
    await waitFor(() => expect(result.current.running).toBe(false));
    expect(result.current.rows.every((r) => r.status === "canceled")).toBe(true);
    // note: in-flight page fetch is not aborted (hook abort gates future pages only) —
    // the hung upload resolves on its own 60s timeout; nothing to await here
  });

  it("marks replacesExisting when chapter number already exists", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/chapters") && !url.includes("upload")) {
        // gateway admin GET wraps rows in { success, data: [...] } envelope
        return new Response(JSON.stringify({ success: true, data: [{ chapter_number: 3 }] }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (url.includes("upload")) {
        return new Response(JSON.stringify({ success: true, data: { urls: ["/api/media/p"] } }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCbzBatchImport("comic-1"));
    const file = await makeCbz({ "001.jpg": PNG_BYTES });
    const named = new File([await file.arrayBuffer()], "chapter-3.cbz", { type: "application/x-cbz" });
    await act(async () => {
      await result.current.selectFiles([named]);
    });
    await act(async () => {
      await result.current.run();
    });
    await waitFor(() => expect(result.current.rows[0].status).toBe("replaced"));
    expect(result.current.rows[0].replacesExisting).toBe(true);
  });
});
