import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupabaseSync } from "../supabase-sync";
import type { Candidate, Decision, Invite, AgentState, Env } from "../types";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const createMockEnv = (): Env => ({
  RecruitmentAgent: {} as any,
  AI: {} as any,
  SEND_EMAIL_BINDING: {} as any,
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_KEY: "test-service-key",
  WORKERS_AI_MODEL: "@cf/meta/llama-3.2-11b-vision-instruct",
  PIXIV_ACCESS_TOKEN: "",
  DEVIANTART_ACCESS_TOKEN: "",
  TWITTER_BEARER_TOKEN: "",
  BEHANCE_CLIENT_ID: "",
});

describe("SupabaseSync", () => {
  let sync: SupabaseSync;

  beforeEach(() => {
    vi.clearAllMocks();
    sync = new SupabaseSync(createMockEnv());
  });

  describe("syncCandidate", () => {
    it("sends PUT request to Supabase candidates table", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const candidate: Candidate = {
        id: "candidate-1",
        sourceUrl: "https://pixiv.net/user/1",
        sourcePlatform: "pixiv",
        creatorName: "Test Artist",
        followerCount: 500,
        status: "pending",
        createdAt: Date.now(),
      };

      await sync.syncCandidate(candidate);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("/recruitment_candidates");
      expect(call[1].method).toBe("PUT");
      const body = JSON.parse(call[1].body);
      expect(body.id).toBe("candidate-1");
      expect(body.creator_name).toBe("Test Artist");
    });
  });

  describe("syncAll", () => {
    it("syncs all state components", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const state: AgentState = {
        adminId: "admin-1",
        scoutSessions: [],
        pendingCandidates: [
          { id: "p1", sourceUrl: "https://example.com", sourcePlatform: "manual", creatorName: "P1", followerCount: 0, status: "pending", createdAt: Date.now() },
        ],
        evaluatedCandidates: [
          { id: "e1", sourceUrl: "https://example.com", sourcePlatform: "manual", creatorName: "E1", followerCount: 10, status: "evaluated", createdAt: Date.now(), evaluatedAt: Date.now() },
        ],
        decisions: [
          { candidateId: "e1", action: "approve", notes: "Great work", adminId: "admin-1", createdAt: Date.now() },
        ],
        invites: [
          { candidateId: "e1", inviteCode: "invite_1", status: "sent", sentAt: Date.now() },
        ],
        lastCronRun: Date.now(),
      };

      await sync.syncAll(state);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe("loadCandidates", () => {
    it("loads and transforms candidates from Supabase", async () => {
      const mockRows = [
        {
          id: "c1",
          source_url: "https://example.com",
          source_platform: "pixiv",
          creator_name: "Artist",
          creator_handle: "artist_handle",
          follower_count: 100,
          evaluation_json: { score: 85, strengths: ["color"], gaps: ["anatomy"], genreMatch: 70, verdict: "strong_match", summary: "Great" },
          status: "evaluated",
          created_at: "2026-01-01T00:00:00Z",
          evaluated_at: "2026-01-02T00:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRows),
      });

      const candidates = await sync.loadCandidates();
      expect(candidates).toHaveLength(1);
      expect(candidates[0].id).toBe("c1");
      expect(candidates[0].evaluation?.score).toBe(85);
      expect(candidates[0].evaluation?.verdict).toBe("strong_match");
    });
  });
});
