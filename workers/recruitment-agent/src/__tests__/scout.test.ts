import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScoutScheduler } from "../scout";
import type { Env } from "../types";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const createMockEnv = (overrides: Partial<Env> = {}): Env => ({
  RecruitmentAgent: {} as any,
  AI: {} as any,
  SEND_EMAIL_BINDING: {} as any,
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_KEY: "test-key",
  WORKERS_AI_MODEL: "@cf/meta/llama-3.2-11b-vision-instruct",
  PIXIV_ACCESS_TOKEN: "",
  DEVIANTART_ACCESS_TOKEN: "",
  TWITTER_BEARER_TOKEN: "",
  BEHANCE_CLIENT_ID: "",
  ...overrides,
});

describe("ScoutScheduler", () => {
  let scheduler: ScoutScheduler;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduler = new ScoutScheduler(createMockEnv());
  });

  describe("manual URL validation", () => {
    it("returns error for empty query", async () => {
      const result = await scheduler.search("manual", "");
      expect(result.error).toBe("Empty query");
      expect(result.candidates).toHaveLength(0);
    });

    it("returns error for invalid URL", async () => {
      const result = await scheduler.search("manual", "not-a-url");
      expect(result.error).toBe("Invalid URL format");
    });

    it("returns error for non-http protocol", async () => {
      const result = await scheduler.search("manual", "ftp://example.com");
      expect(result.error).toBe("URL must use http or https protocol");
    });

    it("accepts valid https URL", async () => {
      const result = await scheduler.search("manual", "https://example.com/portfolio");
      expect(result.error).toBeUndefined();
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].sourceUrl).toBe("https://example.com/portfolio");
    });
  });

  describe("OAuth platforms return error without tokens", () => {
    it("pixiv without token", async () => {
      const result = await scheduler.search("pixiv", "artist");
      expect(result.error).toContain("No Pixiv access token");
    });

    it("deviantart without token", async () => {
      const result = await scheduler.search("deviantart", "artist");
      expect(result.error).toContain("No DeviantArt access token");
    });

    it("twitter without token", async () => {
      const result = await scheduler.search("twitter", "artist");
      expect(result.error).toContain("No Twitter bearer token");
    });

    it("behance without token", async () => {
      const result = await scheduler.search("behance", "artist");
      expect(result.error).toContain("No Behance client ID");
    });
  });

  describe("webtoon HTML parsing", () => {
    it("parses creator info from HTML", async () => {
      const mockHtml = `
        <html>
        <div class="card">
          <p class="subj">Tower of God</p>
          <p class="author">SIU</p>
          <img class="thumb" src="https://webtoon.com/thumb1.jpg" />
        </div>
        <div class="card">
          <p class="subj">The God of High School</p>
          <p class="author">Yongje Park</p>
          <img class="thumb" src="https://webtoon.com/thumb2.jpg" />
        </div>
        </html>
      `;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const result = await scheduler.search("webtoon", "tower of god");
      expect(result.error).toBeUndefined();
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates[0].creatorName).toBe("SIU");
    });
  });

  describe("tapas HTML parsing", () => {
    it("parses creator names from search page", async () => {
      const mockHtml = `
        <html>
        <div class="creator-card">
          <a class="creator-name" href="/creator1">Creator One</a>
          <img class="avatar" src="https://tapas.io/avatar1.jpg" />
        </div>
        <div class="creator-card">
          <a class="creator-name" href="/creator2">Creator Two</a>
          <img class="avatar" src="https://tapas.io/avatar2.jpg" />
        </div>
        </html>
      `;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const result = await scheduler.search("tapas", "creator");
      expect(result.error).toBeUndefined();
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates[0].creatorName).toBe("Creator One");
    });
  });
});
