import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAdRuntime } from "@/components/reader/AdRenderer";

const okBody = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), { status: 200 });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchAdRuntime", () => {
  it("fetches the public site-settings scope and unwraps the data envelope", async () => {
    const rows = [{ key: "ad_header", value: "<a href='https://shope.ee/x'>ad</a>" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okBody(rows)));

    const result = await fetchAdRuntime();

    const fetchMock = vi.mocked(fetch);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/admin/site-settings?scope=public");
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("headers");
    expect(result).toEqual(rows);
  });

  it("returns [] on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("denied", { status: 401 })));
    expect(await fetchAdRuntime()).toEqual([]);
  });

  it("returns [] on malformed envelope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: 1 }), { status: 200 })));
    expect(await fetchAdRuntime()).toEqual([]);
  });

  it("returns [] on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await fetchAdRuntime()).toEqual([]);
  });
});
