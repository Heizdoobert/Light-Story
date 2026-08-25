// @vitest-environment jsdom
// DOMPurify requires a spec-compliant DOM; happy-dom doesn't support it.

import { describe, it, expect } from "vitest";
import { sanitizeAdMarkup } from "@/lib/admin/ad-sanitize";

const ALLOWED_HOSTS = ["pagead2.googlesyndication.com"];

describe("sanitizeAdMarkup (f9)", () => {
  it("keeps AdSense script from an allowlisted host", () => {
    const markup =
      '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script><ins class="adsbygoogle" data-ad-slot="123"></ins>';
    const out = sanitizeAdMarkup(markup, ALLOWED_HOSTS);
    expect(out).toContain("adsbygoogle.js");
    expect(out).toContain("data-ad-slot");
  });

  it("drops inline scripts", () => {
    const out = sanitizeAdMarkup("<script>alert(1)</script><p>ok</p>", ALLOWED_HOSTS);
    expect(out).not.toContain("script");
    expect(out).toContain("<p>ok</p>");
  });

  it("drops scripts from hosts outside the allowlist", () => {
    const out = sanitizeAdMarkup(
      '<script src="https://evil.example/x.js"></script><b>hi</b>',
      ALLOWED_HOSTS,
    );
    expect(out).not.toContain("evil.example");
    expect(out).toContain("<b>hi</b>");
  });

  it("strips event handlers and javascript: URLs", () => {
    const out = sanitizeAdMarkup(
      '<img src="x.png" onerror="alert(1)"><a href="javascript:alert(1)">click</a>',
      ALLOWED_HOSTS,
    );
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("javascript:");
  });

  it("strips base and iframe tags", () => {
    const out = sanitizeAdMarkup(
      '<base href="https://evil.example/"><iframe src="https://evil.example"></iframe>',
      ALLOWED_HOSTS,
    );
    expect(out).not.toContain("base");
    expect(out).not.toContain("iframe");
  });

  it("keeps the container id and data-* attrs affiliate widgets bind to", () => {
    const markup =
      '<div id="shopee-widget-123" data-shopee-widget="banner"></div><script src="https://shope.ee/widget.js"></script>';
    const out = sanitizeAdMarkup(markup, ["shope.ee"]);
    expect(out).toContain('id="shopee-widget-123"');
    expect(out).toContain('data-shopee-widget="banner"');
    expect(out).toContain("shope.ee/widget.js");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeAdMarkup("", ALLOWED_HOSTS)).toBe("");
  });
});
