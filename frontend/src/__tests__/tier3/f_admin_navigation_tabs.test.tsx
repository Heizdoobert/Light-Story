import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { AdminHeader } from "@/components/layout/admin-header";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { ROUTES } from "@/lib/constants/routes";

const mockAuth = vi.hoisted(() => ({
  user: { id: "admin-1", email: "admin@test.com" },
  profile: { full_name: "Admin Tester", avatar_url: null },
  role: "superadmin",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => ROUTES.ADMIN.COMICS,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockAuth.user,
    profile: mockAuth.profile,
    role: mockAuth.role,
  }),
}));

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    language: "VI",
    setLanguage: vi.fn(),
    t: (key: string) => key,
  }),
}));

vi.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    theme: "dark",
    toggleTheme: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null }),
        }),
      }),
    }),
  }),
}));

describe("Admin Navigation & Quick Tabs", () => {
  beforeEach(() => {
    mockAuth.role = "superadmin";
  });

  it("AdminHeader renders breadcrumb and active quick tabs", () => {
    render(<AdminHeader />);

    // Breadcrumb
    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(breadcrumb).toBeInTheDocument();
    expect(within(breadcrumb).getByText("Admin")).toBeInTheDocument();
    expect(within(breadcrumb).getByText("Truyện")).toBeInTheDocument();

    // Quick Portal Link to public site
    const publicLink = screen.getByText("Xem trang đọc").closest("a");
    expect(publicLink).toHaveAttribute("href", ROUTES.HOME);

    // Quick Tabs Strip
    const quickTabs = screen.getByRole("navigation", { name: "QuickTabs" });
    expect(within(quickTabs).getByText("Truyện")).toBeInTheDocument();
    expect(within(quickTabs).getByText("Tổng quan")).toBeInTheDocument();
    expect(within(quickTabs).getByText("Chương")).toBeInTheDocument();
    expect(within(quickTabs).getByText("Thể loại")).toBeInTheDocument();
    expect(within(quickTabs).getByText("Thẻ Tag")).toBeInTheDocument();
    expect(within(quickTabs).getByText("Cài đặt")).toBeInTheDocument();
  });

  it("AdminHeader filters quick tabs by role for employee", () => {
    mockAuth.role = "employee";
    render(<AdminHeader />);

    const quickTabs = screen.getByRole("navigation", { name: "QuickTabs" });

    // Employee sees comics, chapters, categories
    expect(within(quickTabs).getByText("Truyện")).toBeInTheDocument();
    expect(within(quickTabs).getByText("Chương")).toBeInTheDocument();

    // Employee should NOT see superadmin-only tabs: users, settings, audit
    expect(within(quickTabs).queryByText("Người dùng")).toBeNull();
    expect(within(quickTabs).queryByText("Cài đặt")).toBeNull();
    expect(within(quickTabs).queryByText("Audit Log")).toBeNull();
  });

  it("AdminHeader calls onToggleMobileSidebar when hamburger is clicked", () => {
    const onToggle = vi.fn();
    render(<AdminHeader onToggleMobileSidebar={onToggle} />);

    const toggleBtn = screen.getByRole("button", { name: "Mở menu quản trị" });
    fireEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("AdminSidebar renders grouped navigation sections", () => {
    render(<AdminSidebar />);

    // Section group headers
    expect(screen.getByText("Tổng quan")).toBeInTheDocument();
    expect(screen.getByText("Quản lý nội dung")).toBeInTheDocument();
    expect(screen.getByText("Hệ thống & Vận hành")).toBeInTheDocument();

    // Core navigation items inside groups
    expect(screen.getByText("nav_comics")).toBeInTheDocument();
    expect(screen.getByText("nav_chapters")).toBeInTheDocument();
  });
});
