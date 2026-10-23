import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImageUploader } from "@/components/admin/image-uploader";
import { toast } from "sonner";
import { uploadToR2 } from "@/lib/r2/upload";
import { resizeImageFile } from "@/lib/r2/resize";
import { processCbzFile } from "@/lib/r2/cbz-processor";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock r2 upload and resize
vi.mock("@/lib/r2/upload", () => ({
  uploadToR2: vi.fn(),
}));

vi.mock("@/lib/r2/resize", () => ({
  resizeImageFile: vi.fn(),
}));

// Mock cbz processor
vi.mock("@/lib/r2/cbz-processor", () => ({
  processCbzFile: vi.fn(),
}));

// Mock Next.js Image
vi.mock("next/image", () => ({
  default: (props: any) => <img alt={props.alt || "image"} {...props} />,
}));

// Mock image URL resolver
vi.mock("@/lib/utils/image-url", () => ({
  getR2ImageUrl: (url: string) => `https://cdn.lightstory.test/${url}`,
}));

describe("ImageUploader TDD Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("UI Rendering & Formatted Limits", () => {
    it("renders default maximum file size formatted via formatBytes (50 MB)", () => {
      render(<ImageUploader />);
      expect(screen.getByText(/tối đa 50 MB/i)).toBeInTheDocument();
    });

    it("renders custom maxSizeBytes formatted dynamically (e.g. 15 MB)", () => {
      render(<ImageUploader maxSizeBytes={15 * 1024 * 1024} />);
      expect(screen.getByText(/tối đa 15 MB/i)).toBeInTheDocument();
    });
  });

  describe("File Validation & onValidationError callback (RED phase)", () => {
    it("rejects oversized file, displays formatted toast error, and triggers onValidationError", async () => {
      const onValidationError = vi.fn();
      const { container } = render(
        <ImageUploader maxSizeBytes={10 * 1024 * 1024} onValidationError={onValidationError} />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();

      // Create an oversized file (12 MB)
      const oversizedFile = new File([new Uint8Array(100)], "huge-chapter.cbz", {
        type: "application/x-cbz",
      });
      Object.defineProperty(oversizedFile, "size", { value: 12 * 1024 * 1024 });

      fireEvent.change(input, { target: { files: [oversizedFile] } });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("huge-chapter.cbz (12 MB)")
        );
      });

      // Verify that onValidationError was called with the file and reason
      expect(onValidationError).toHaveBeenCalledTimes(1);
      expect(onValidationError).toHaveBeenCalledWith(
        oversizedFile,
        expect.stringContaining("10MB")
      );

      // Verify upload pipeline was NOT called
      expect(uploadToR2).not.toHaveBeenCalled();
      expect(processCbzFile).not.toHaveBeenCalled();
    });

    it("rejects empty 0-byte file and invokes onValidationError with formatBytes 0 B", async () => {
      const onValidationError = vi.fn();
      const { container } = render(<ImageUploader onValidationError={onValidationError} />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const emptyFile = new File([], "empty-page.jpg", { type: "image/jpeg" });
      Object.defineProperty(emptyFile, "size", { value: 0 });

      fireEvent.change(input, { target: { files: [emptyFile] } });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("empty-page.jpg (0 B)")
        );
      });

      expect(onValidationError).toHaveBeenCalledWith(
        emptyFile,
        expect.stringContaining("0 bytes")
      );
      expect(uploadToR2).not.toHaveBeenCalled();
    });

    it("rejects files with unsupported extensions (e.g. malware.exe)", async () => {
      const onValidationError = vi.fn();
      const { container } = render(<ImageUploader onValidationError={onValidationError} />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const badFile = new File([new Uint8Array(50)], "malware.exe", {
        type: "application/x-msdownload",
      });
      Object.defineProperty(badFile, "size", { value: 50 });

      fireEvent.change(input, { target: { files: [badFile] } });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining(".exe is not allowed")
        );
      });

      expect(onValidationError).toHaveBeenCalledTimes(1);
      expect(uploadToR2).not.toHaveBeenCalled();
    });
  });

  describe("Upload Flows & Previews", () => {
    it("successfully resizes and uploads an image, formatting progress with formatBytes", async () => {
      const onImagesUploaded = vi.fn();
      const mockResized = {
        file: new File(["data"], "page_01.webp", { type: "image/webp" }),
        width: 800,
        height: 1200,
      };
      vi.mocked(resizeImageFile).mockResolvedValue(mockResized);
      vi.mocked(uploadToR2).mockResolvedValue({
        success: true,
        url: "chapters/page_01.webp",
      });

      const { container } = render(<ImageUploader onImagesUploaded={onImagesUploaded} />);
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;

      const validImage = new File(["valid-binary-content"], "page_01.jpg", {
        type: "image/jpeg",
      });
      Object.defineProperty(validImage, "size", { value: 2048 }); // 2 KB

      fireEvent.change(input, { target: { files: [validImage] } });

      await waitFor(() => {
        expect(resizeImageFile).toHaveBeenCalledWith(validImage);
        expect(uploadToR2).toHaveBeenCalledWith(mockResized.file, "chapters");
        expect(onImagesUploaded).toHaveBeenCalledWith(["chapters/page_01.webp"]);
      });

      // Verify preview is rendered
      expect(screen.getByText("Đã tải lên 1 trang ảnh chương")).toBeInTheDocument();
      expect(screen.getByText("P.1")).toBeInTheDocument();
    });

    it("clears previews when 'Xóa tất cả' is clicked", async () => {
      vi.mocked(resizeImageFile).mockResolvedValue({
        file: new File(["x"], "p1.webp", { type: "image/webp" }),
        width: 100,
        height: 100,
      });
      vi.mocked(uploadToR2).mockResolvedValue({
        success: true,
        url: "chapters/p1.webp",
      });

      const { container } = render(<ImageUploader />);
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const validImage = new File(["test"], "p1.jpg", { type: "image/jpeg" });
      Object.defineProperty(validImage, "size", { value: 1024 });

      fireEvent.change(input, { target: { files: [validImage] } });

      await waitFor(() => {
        expect(screen.getByText("Đã tải lên 1 trang ảnh chương")).toBeInTheDocument();
      });

      const clearAllBtn = screen.getByRole("button", { name: /Xóa tất cả/i });
      fireEvent.click(clearAllBtn);

      expect(screen.queryByText("Đã tải lên 1 trang ảnh chương")).not.toBeInTheDocument();
      expect(screen.queryByText("P.1")).not.toBeInTheDocument();
    });
  });
});
