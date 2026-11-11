import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PublicFooter from "@/components/layout/public-footer";
import { ROUTES } from "@/lib/constants/routes";

const mockRoute = vi.hoisted(() => ({
  pathname: "/",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockRoute.pathname,
}));

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    language: "VI",
    t: (key: string) => key,
  }),
}));

describe("PublicFooter Component", () => {
  beforeEach(() => {
    mockRoute.pathname = "/";
  });

  it("renders brand, about info, and status indicator", () => {
    render(<PublicFooter />);

    // Brand
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Story")).toBeInTheDocument();

    // About & status
    expect(screen.getByText("footer_about")).toBeInTheDocument();
    expect(screen.getByText("footer_system_status")).toBeInTheDocument();
  });

  it("renders navigation columns and community links", () => {
    render(<PublicFooter />);

    // Column Headings
    expect(screen.getByText("footer_explore")).toBeInTheDocument();
    expect(screen.getByText("footer_personal")).toBeInTheDocument();
    expect(screen.getByText("footer_legal")).toBeInTheDocument();

    // Community links
    const fanpageLink = screen.getByText("Fanpage").closest("a");
    expect(fanpageLink).toHaveAttribute("href", ROUTES.FANPAGE);

    const groupLink = screen.getByText("Nhóm độc giả").closest("a");
    expect(groupLink).toHaveAttribute("href", ROUTES.GROUP);
  });

  it("triggers smooth scrollTo when back to top button is clicked", () => {
    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    render(<PublicFooter />);

    const backToTopBtn = screen.getByRole("button", { name: "footer_back_to_top" });
    expect(backToTopBtn).toBeInTheDocument();

    fireEvent.click(backToTopBtn);
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("returns null on admin routes", () => {
    mockRoute.pathname = "/admin/comics";
    const { container } = render(<PublicFooter />);

    expect(container.firstChild).toBeNull();
  });
});
