import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import manifest from "@/app/manifest";
import {
  SpoilerText,
  containsSpoiler,
} from "@/components/shared/SpoilerText";
import { ChapterCommentsSection } from "@/components/reader/ChapterCommentsSection";

describe("Tier 1 System Update Suite", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Web App Manifest (PWA)", () => {
    it("returns standalone PWA configuration with brand colors and icons", () => {
      const config = manifest();
      expect(config.name).toBe("Light Story - Đọc Truyện Tranh Trực Tuyến");
      expect(config.short_name).toBe("Light Story");
      expect(config.display).toBe("standalone");
      expect(config.theme_color).toBe("#f97316");
      expect(config.background_color).toBe("#0f172a");
      expect(config.icons).toBeDefined();
      expect(config.icons?.length).toBeGreaterThan(0);
      expect(config.icons?.[0].src).toBe("/icon.svg");
    });
  });

  describe("SpoilerText Component", () => {
    it("detects spoilers accurately with containsSpoiler helper", () => {
      expect(containsSpoiler("Bình thường không có gì")).toBe(false);
      expect(containsSpoiler("Đoạn này >!nhân vật chính chết!< buồn quá")).toBe(true);
      expect(containsSpoiler("Đoạn này ||kẻ phản bội lộ diện|| sốc")).toBe(true);
    });

    it("renders spoiler text masked initially and reveals on click", () => {
      render(
        <SpoilerText content="Tập này >!trùm cuối lộ diện!< rất bất ngờ" />
      );

      expect(screen.getByText(/Tập này/)).toBeDefined();
      expect(screen.getByText(/rất bất ngờ/)).toBeDefined();

      const spoilerBtn = screen.getByRole("button", {
        name: /trùm cuối lộ diện/i,
      });
      expect(spoilerBtn).toBeDefined();
      expect(spoilerBtn.getAttribute("aria-expanded")).toBe("false");
      expect(spoilerBtn.className).toContain("text-transparent");

      // Click to reveal
      fireEvent.click(spoilerBtn);
      expect(spoilerBtn.getAttribute("aria-expanded")).toBe("true");
      expect(spoilerBtn.className).not.toContain("text-transparent");

      // Click again to re-hide
      fireEvent.click(spoilerBtn);
      expect(spoilerBtn.getAttribute("aria-expanded")).toBe("false");
    });
  });

  describe("ChapterCommentsSection Component", () => {
    it("renders comments UI and allows adding new comment with spoiler", () => {
      render(
        <ChapterCommentsSection chapterId="chap-123" comicId="comic-abc" />
      );

      // Verify header is present
      expect(screen.getByText("Bình luận & Thảo luận")).toBeDefined();

      // Find form inputs
      const nameInput = screen.getByPlaceholderText(
        "Tên của bạn (hoặc để ẩn danh)..."
      );
      const textArea = screen.getByPlaceholderText(
        /Chia sẻ cảm nghĩ của bạn về chương truyện này/i
      );
      const submitBtn = screen.getByRole("button", { name: /Gửi bình luận/i });

      // Fill in comment
      fireEvent.change(nameInput, { target: { value: "Độc Giả Vip" } });
      fireEvent.change(textArea, {
        target: { value: "Truyện cuốn quá, đoạn >!kết mở!< làm tò mò!" },
      });

      // Submit
      fireEvent.click(submitBtn);

      // Verify new comment is displayed
      expect(screen.getByText("Độc Giả Vip")).toBeDefined();
      expect(screen.getByText(/kết mở/i)).toBeDefined();

      // Check localStorage persistence
      const saved = localStorage.getItem("comments:chap-123");
      expect(saved).not.toBeNull();
      expect(saved).toContain("Độc Giả Vip");
      expect(saved).toContain("kết mở");
    });

    it("inserts spoiler template when clicking Chèn Spoiler button", () => {
      render(
        <ChapterCommentsSection chapterId="chap-456" comicId="comic-xyz" />
      );

      const spoilerInsertBtn = screen.getByRole("button", {
        name: /Chèn Spoiler/i,
      });
      const textArea = screen.getByPlaceholderText(
        /Chia sẻ cảm nghĩ của bạn về chương truyện này/i
      ) as HTMLTextAreaElement;

      fireEvent.click(spoilerInsertBtn);
      expect(textArea.value).toContain(">!nội dung spoiler!<");
    });
  });
});
