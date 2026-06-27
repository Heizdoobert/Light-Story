import { describe, it, expect, vi, beforeEach } from "vitest";
import { InviteSender } from "../invite-sender";
import type { Env } from "../types";

const createMockEnv = (): Env => ({
  RecruitmentAgent: {} as any,
  AI: {} as any,
  SEND_EMAIL_BINDING: { send: vi.fn() } as any,
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_KEY: "test-key",
  WORKERS_AI_MODEL: "@cf/meta/llama-3.2-11b-vision-instruct",
  PIXIV_ACCESS_TOKEN: "",
  DEVIANTART_ACCESS_TOKEN: "",
  TWITTER_BEARER_TOKEN: "",
  BEHANCE_CLIENT_ID: "",
});

const mockCandidate = {
  id: "test-id",
  sourceUrl: "https://example.com/portfolio",
  sourcePlatform: "pixiv" as const,
  creatorName: "Test Creator",
  creatorHandle: "test_handle",
  followerCount: 1000,
  status: "approved" as const,
  createdAt: Date.now(),
};

describe("InviteSender", () => {
  let sender: InviteSender;

  beforeEach(() => {
    vi.clearAllMocks();
    sender = new InviteSender(createMockEnv());
  });

  it("builds HTML template with creator name and invite URL", () => {
    const inviteCode = "invite_abc123";
    const html = (sender as any).buildHtmlTemplate("Test Creator", `https://lightstory.com/recruitment/invite/${inviteCode}`);
    expect(html).toContain("Test Creator");
    expect(html).toContain(inviteCode);
    expect(html).toContain("Light Story");
  });

  it("builds text template with creator name and invite URL", () => {
    const inviteCode = "invite_abc123";
    const text = (sender as any).buildTextTemplate("Test Creator", `https://lightstory.com/recruitment/invite/${inviteCode}`);
    expect(text).toContain("Test Creator");
    expect(text).toContain(inviteCode);
  });

  it("handles send failure gracefully", async () => {
    const env = createMockEnv();
    env.SEND_EMAIL_BINDING.send = vi.fn().mockRejectedValueOnce(new Error("Email service unavailable"));
    const senderWithFail = new InviteSender(env);

    const result = await senderWithFail.sendInvite(mockCandidate, "invite_fail");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Email service unavailable");
  });

  it("sends email successfully", async () => {
    const env = createMockEnv();
    env.SEND_EMAIL_BINDING.send = vi.fn().mockResolvedValueOnce(undefined);
    const senderWithOk = new InviteSender(env);

    const result = await senderWithOk.sendInvite(mockCandidate, "invite_ok");
    expect(result.success).toBe(true);
  });

  it("escapes HTML in creator names", () => {
    const html = (sender as any).buildHtmlTemplate('<script>alert("xss")</script>', "https://lightstory.com/invite/test");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
