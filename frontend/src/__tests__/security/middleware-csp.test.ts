// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware";

async function headersFor(nodeEnv: string) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
  ]) {
    vi.stubEnv(key, "");
  }
  const response = await middleware(new NextRequest("https://example.com/"));
  return response.headers;
}

describe("middleware security headers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("production CSP has no local sources and allows AdSense frames", async () => {
    const csp = (await headersFor("production")).get("Content-Security-Policy") ?? "";
    expect(csp).not.toMatch(/localhost|127\.0\.0\.1|host\.docker\.internal/);
    expect(csp).toContain("frame-src https://googleads.g.doubleclick.net");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("development CSP keeps local gateway sources", async () => {
    const csp = (await headersFor("development")).get("Content-Security-Policy") ?? "";
    expect(csp).toContain("http://localhost:*");
    expect(csp).toContain("'unsafe-eval'");
  });

  it("Permissions-Policy denies sensitive features", async () => {
    const policy = (await headersFor("production")).get("Permissions-Policy") ?? "";
    for (const feature of ["camera=()", "microphone=()", "geolocation=()", "payment=()", "usb=()", "display-capture=()"]) {
      expect(policy).toContain(feature);
    }
  });
});
