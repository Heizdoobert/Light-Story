import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, renderHook, fireEvent, waitFor, act } from "@testing-library/react";
import { CreateComicForm } from "@/components/comics/CreateComicForm";
import { useCreateComicPresenter } from "@/hooks/presenters/useCreateComicPresenter";
import { createComicFromMetadata } from "@/services/comics/comicCms.service";

const { mockUploadComicCover, mockCreateComic, mockPush, mockApiClient } = vi.hoisted(() => ({
  mockUploadComicCover: vi.fn(),
  mockCreateComic: vi.fn(),
  mockPush: vi.fn(),
  mockApiClient: { post: vi.fn(), get: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
const mockAlert = vi.fn();

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

vi.mock("@/lib/api/apiClient", () => ({ apiClient: mockApiClient }));

const validPng = new File(["fake-png"], "cover.png", { type: "image/png" });
const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal("alert", mockAlert);
  URL.createObjectURL = vi.fn(() => "blob:mock-cover") as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("F7 presenter wiring (useCreateComicPresenter)", () => {
  it("submits cover upload before comic creation and passes the uploaded URL through", async () => {
    mockUploadComicCover.mockResolvedValue("https://r2.test/covers/cover.webp");
    mockCreateComic.mockResolvedValue({ id: "c-42", title: "My Comic" });

    const { result } = renderHook(() => useCreateComicPresenter());
    await act(async () => {
      result.current.setTitle("My Comic");
      result.current.setDescription("A test story");
      result.current.setCover(validPng);
    });
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockUploadComicCover).toHaveBeenCalledWith(validPng);
    expect(mockCreateComic).toHaveBeenCalledWith({
      title: "My Comic",
      description: "A test story",
      coverUrl: "https://r2.test/covers/cover.webp",
    });
    expect(mockUploadComicCover.mock.invocationCallOrder[0]).toBeLessThan(
      mockCreateComic.mock.invocationCallOrder[0],
    );
  });

  it("announces success and navigates to the add-chapter page after creation", async () => {
    mockUploadComicCover.mockResolvedValue("https://r2.test/covers/cover.webp");
    mockCreateComic.mockResolvedValue({ id: "c-42", title: "My Comic" });

    const { result } = renderHook(() => useCreateComicPresenter());
    await act(async () => {
      result.current.setTitle("My Comic");
      result.current.setCover(validPng);
    });
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockAlert).toHaveBeenCalledWith("Comic created: My Comic");
    expect(mockPush).toHaveBeenCalledWith("/comics/c-42/add-chapter?storyId=c-42");
    expect(result.current.loading).toBe(false);
  });

  it("blocks submission without a cover and never touches the services", async () => {
    const { result } = renderHook(() => useCreateComicPresenter());
    await act(async () => {
      result.current.setTitle("No cover comic");
    });
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockAlert).toHaveBeenCalledWith("Cover image required");
    expect(mockUploadComicCover).not.toHaveBeenCalled();
    expect(mockCreateComic).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("surfaces an upload failure without navigating", async () => {
    mockUploadComicCover.mockRejectedValue(new Error("Upload failed"));

    const { result } = renderHook(() => useCreateComicPresenter());
    await act(async () => {
      result.current.setTitle("My Comic");
      result.current.setCover(validPng);
    });
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockAlert).toHaveBeenCalledWith("Upload failed");
    expect(mockCreateComic).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("surfaces a creation failure and falls back to the generic message for non-Error throws", async () => {
    mockUploadComicCover.mockResolvedValue("https://r2.test/covers/cover.webp");
    mockCreateComic.mockRejectedValue({ message: "Create failed" });

    const { result } = renderHook(() => useCreateComicPresenter());
    await act(async () => {
      result.current.setTitle("My Comic");
      result.current.setCover(validPng);
    });
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockAlert).toHaveBeenCalledWith("Failed to create comic");
    expect(mockPush).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("rejects non-image cover files before any preview is generated", async () => {
    const { result } = renderHook(() => useCreateComicPresenter());
    const badFile = new File(["x"], "notes.txt", { type: "text/plain" });
    await act(async () => {
      result.current.setCover(badFile);
    });

    expect(mockAlert).toHaveBeenCalledWith(
      "Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed.",
    );
    expect(result.current.previewUrl).toBeNull();
    expect(result.current.cover).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});

describe("F7 UI wiring (CreateComicForm)", () => {
  it("renders the create form and rejects submission without a cover", async () => {
    render(<CreateComicForm />);
    expect(screen.getByPlaceholderText("Title")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Description")).toBeInTheDocument();
    expect(screen.getByText("Cover Image")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Title"), {
      target: { value: "Form Comic" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Comic" }));

    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith("Cover image required"));
    expect(mockUploadComicCover).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("sends the form values through the presenter to the services on submit", async () => {
    mockUploadComicCover.mockResolvedValue("https://r2.test/covers/form.webp");
    mockCreateComic.mockResolvedValue({ id: "c-99", title: "Form Comic" });

    render(<CreateComicForm />);
    fireEvent.change(screen.getByPlaceholderText("Title"), {
      target: { value: "Form Comic" },
    });
    fireEvent.change(screen.getByPlaceholderText("Description"), {
      target: { value: "From the form" },
    });
    fireEvent.change(screen.getByLabelText("Cover Image"), {
      target: { files: [validPng] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Comic" }));

    await waitFor(() =>
      expect(mockCreateComic).toHaveBeenCalledWith({
        title: "Form Comic",
        description: "From the form",
        coverUrl: "https://r2.test/covers/form.webp",
      }),
    );
    expect(mockUploadComicCover).toHaveBeenCalledWith(validPng);
    expect(mockPush).toHaveBeenCalledWith("/comics/c-99/add-chapter?storyId=c-99");
  });
});

describe("F7 CMS hub wiring (createComicFromMetadata)", () => {
  it("uploads the cover then creates the comic and seeds the local catalog", async () => {
    mockUploadComicCover.mockResolvedValue("https://r2.test/covers/cms.webp");
    mockApiClient.post.mockResolvedValue([
      {
        id: "c-7",
        title: "CMS Comic",
        author: "Unknown",
        description: "Created via CMS",
        status: "draft",
        cover_url: "https://r2.test/covers/cms.webp",
        views: 0,
        updated_at: "2026-01-02T00:00:00.000Z",
      },
    ]);

    const record = await createComicFromMetadata({
      title: "CMS Comic",
      slug: "cms-comic",
      author: "Unknown",
      translator: "Unknown",
      description: "Created via CMS",
      status: "draft",
      coverUrl: "",
      coverFile: validPng,
    });

    expect(mockUploadComicCover).toHaveBeenCalledWith(validPng);
    expect(mockApiClient.post).toHaveBeenCalledWith("/api/admin/comics", {
      title: "CMS Comic",
      author: "Unknown",
      description: "Created via CMS",
      status: "draft",
      coverUrl: "https://r2.test/covers/cms.webp",
    });
    expect(record.id).toBe("c-7");
    const catalog = JSON.parse(localStorage.getItem("comic-cms:catalog") ?? "[]");
    expect(catalog).toHaveLength(1);
    expect(catalog[0].id).toBe("c-7");
  });

  it("skips the upload when an existing cover URL is provided", async () => {
    mockApiClient.post.mockResolvedValue([
      {
        id: "c-8",
        title: "No Upload",
        author: "Someone",
        description: "",
        status: "ongoing",
        cover_url: "https://existing.example/cover.jpg",
        views: 5,
        updated_at: "2026-01-03T00:00:00.000Z",
      },
    ]);

    const record = await createComicFromMetadata({
      title: "No Upload",
      slug: "no-upload",
      author: "Someone",
      translator: "Unknown",
      description: "",
      status: "ongoing",
      coverUrl: "https://existing.example/cover.jpg",
    });

    expect(mockUploadComicCover).not.toHaveBeenCalled();
    expect(mockApiClient.post).toHaveBeenCalledWith("/api/admin/comics", {
      title: "No Upload",
      author: "Someone",
      description: "",
      status: "ongoing",
      coverUrl: "https://existing.example/cover.jpg",
    });
    expect(record.status).toBe("ongoing");
  });
});
