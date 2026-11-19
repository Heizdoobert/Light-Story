// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => { throw new Error("supabase down"); },
}));

import { middleware } from "../../middleware";
import { NextRequest } from "next/server";

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  errorSpy.mockRestore();
});

describe("middleware failsafe", () => {
  it("redirects admin requests with security and robots headers", async () => {
    const response = await middleware(new NextRequest("https://example.com/admin"));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/handle-exception/401");
    expect(response.headers.get("Content-Security-Policy")).toBeTruthy();
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("redirects user requests to login", async () => {
    const response = await middleware(new NextRequest("https://example.com/user/bookmarks"));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/auth/login");
  });

  it("continues public requests with security headers", async () => {
    const response = await middleware(new NextRequest("https://example.com/"));
    expect(response.headers.get("Content-Security-Policy")).toBeTruthy();
    expect(response.headers.get("X-Robots-Tag")).toBeNull();
  });
});
