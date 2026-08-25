// @vitest-environment jsdom
// Behavioral guard for the ads-never-rendered bug: given public settings
// containing slot markup, AdRenderer must inject it into the DOM.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdRenderer } from "@/components/reader/AdRenderer";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: [{ key: "ad_header", value: '<a href="https://shope.ee/x">Buy now</a>' }],
  }),
}));

class MockObserver {
  private callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe() {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  disconnect() {}
  unobserve() {}
}

describe("AdRenderer (public ads render)", () => {
  it("injects the configured slot markup into the DOM", async () => {
    vi.stubGlobal("IntersectionObserver", MockObserver);

    render(<AdRenderer position="header" />);

    const link = await screen.findByRole("link", { name: "Buy now" });
    expect(link).toHaveAttribute("href", "https://shope.ee/x");
  });

  it("renders nothing when the slot has no markup", async () => {
    vi.stubGlobal("IntersectionObserver", MockObserver);

    const { container } = render(<AdRenderer position="sidebar" />);

    await waitFor(() => {
      expect(container.querySelector('[data-ad-slot="ad_sidebar"]')).toBeNull();
    });
  });
});
