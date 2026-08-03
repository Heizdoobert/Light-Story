import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, renderHook, fireEvent, waitFor, act } from "@testing-library/react";
import { CreateComicForm } from "@/components/comics/CreateComicForm";
import { useCreateComicPresenter } from "@/hooks/presenters/useCreateComicPresenter";
import { createComicFromMetadata } from "@/services/comics/comicCms.service";

const { mockUploadComicCover, mockCreateComic, mockPush, mockAlert, mockApiClient } = vi.hoisted(() => ({
  mockUploadComicCover: vi.fn(),
  mockCreateComic: vi.fn(),
  mockPush: vi.fn(),
  mockAlert: vi.fn(),
  mockApiClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/services/comics/comic.service", () => ({
  uploadComicCover: mockUploadComicCover,
  createComic: mockCreateComic,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush }),
  usePathname: () => "/comics/new",
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, role: "admin", loading: false }),
  UserRole: {},
}));

vi.mock("@/lib/api/apiClient", () => ({
  apiClient: mockApiClient,
}));

const validPng = new File(["fake-png"], "cover.png", { type: "image/png" });
const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

describe("F7 fullstack boundary (useCreateComicPresenter)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal("alert", mockAlert);
    URL.createObjectURL = vi.fn(() => "blob:mock-cover");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("alerts when cover is missing and performs zero service calls", async () => {
    const { result } = renderHook(() => useCreateComicPresenter());

    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockAlert).toHaveBeenCalledWith("Cover image required");
    expect(mockUploadComicCover).not.toHaveBeenCalled();
    expect(mockCreateComic).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("rejects invalid cover type, clears cover, and recovers on valid selection", async () => {
    const { result } = renderHook(() => useCreateComicPresenter());
    const txtFile = new File(["text"], "notes.txt", { type: "text/plain" });

    act(() => {
      result.current.setCover(txtFile);
    });

    expect(mockAlert).toHaveBeenCalledWith("Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed.");
    expect(result.current.cover).toBeNull();
    expect(result.current.previewUrl).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();

    act(() => {
      result.current.setCover(validPng);
    });

    expect(result.current.previewUrl).toBe("blob:mock-cover");
    expect(mockAlert).toHaveBeenCalledTimes(1);
  });

  it("surfaces upload failure without calling createComic or navigating", async () => {
    mockUploadComicCover.mockRejectedValue(new Error("Upload failed"));
    const { result } = renderHook(() => useCreateComicPresenter());

    act(() => {
      result.current.setCover(validPng);
    });

    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockCreateComic).not.toHaveBeenCalled();
    expect(mockAlert).toHaveBeenCalledWith("Upload failed");
    expect(mockPush).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("surfaces createComic failure and does not navigate", async () => {
    mockUploadComicCover.mockResolvedValue("https://r2.example.com/cover.jpg");
    mockCreateComic.mockRejectedValue(new Error("Server down"));
    const { result } = renderHook(() => useCreateComicPresenter());

    act(() => {
      result.current.setCover(validPng);
    });

    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockAlert).toHaveBeenCalledWith("Server down");
    expect(mockPush).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("navigates exactly once to the add-chapter path on success", async () => {
    mockUploadComicCover.mockResolvedValue("https://r2.example.com/cover.jpg");
    mockCreateComic.mockResolvedValue({ id: "c1", title: "My Comic" });
    const { result } = renderHook(() => useCreateComicPresenter());

    act(() => {
      result.current.setTitle("My Comic");
      result.current.setCover(validPng);
    });

    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockAlert).toHaveBeenCalledWith("Comic created: My Comic");
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/comics/c1/add-chapter?storyId=c1");
    expect(result.current.loading).toBe(false);
  });
});

describe("F7 fullstack boundary (CreateComicForm)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal("alert", mockAlert);
    URL.createObjectURL = vi.fn(() => "blob:mock-cover");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("disables the submit button while pending (double-submit guard)", async () => {
    let resolveUpload: ((url: string) => void) | undefined;
    mockUploadComicCover.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    );
    mockCreateComic.mockResolvedValue({ id: "c1", title: "My Comic" });

    const { container } = render(<CreateComicForm />);
    fireEvent.change(screen.getByPlaceholderText("Title"), { target: { value: "My Comic" } });
    fireEvent.change(screen.getByLabelText(/Cover Image/i), { target: { files: [validPng] } });

    fireEvent.submit(container.querySelector("form")!);

    expect(screen.getByRole("button", { name: "Creating…" }).getAttribute("disabled")).not.toBeNull();
    expect(mockUploadComicCover).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpload!("https://r2.example.com/cover.jpg");
    });

    await waitFor(() => expect(mockCreateComic).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("button", { name: "Create Comic" }).getAttribute("disabled")).toBeNull());
  });

  it("passes empty title through to the API (no runtime title validation)", async () => {
    mockUploadComicCover.mockResolvedValue("https://r2.example.com/cover.jpg");
    mockCreateComic.mockResolvedValue({ id: "c1", title: "" });

    const { container } = render(<CreateComicForm />);
    fireEvent.change(screen.getByLabelText(/Cover Image/i), { target: { files: [validPng] } });

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(mockCreateComic).toHaveBeenCalledWith({ title: "", description: "", coverUrl: "https://r2.example.com/cover.jpg" }));
  });
});

describe("F7 fullstack boundary (createComicFromMetadata)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("rejects on server error without touching the catalog", async () => {
    mockApiClient.post.mockRejectedValue(new Error("Server error"));

    await expect(
      createComicFromMetadata({ title: "T", description: "D", author: "", status: "draft", coverFile: null, slug: "slug-t", translator: "", coverUrl: "" }),
    ).rejects.toThrow("Server error");

    expect(mockUploadComicCover).not.toHaveBeenCalled();
    expect(localStorage.getItem("comic-cms:catalog")).toBeNull();
  });

  it("posts empty coverUrl as undefined when no cover file or url provided", async () => {
    mockApiClient.post.mockResolvedValue({ id: "new-id", title: "T", author: "A", description: "D", status: "draft" });

    await createComicFromMetadata({ title: "T", description: "D", author: "", status: "draft", coverFile: null, slug: "slug-t", translator: "", coverUrl: "" });

    expect(mockApiClient.post).toHaveBeenCalledWith("/api/admin/comics", {
      title: "T",
      author: "Unknown",
      description: "D",
      status: "draft",
      coverUrl: undefined,
    });
    expect(mockUploadComicCover).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("comic-cms:catalog")!)[0].id).toBe("new-id");
  });
});
