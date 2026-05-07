import { NextResponse } from "next/server";

async function readJsonBody<T>(request: Request): Promise<T> {
  const text = await request.text();
  if (!text.trim()) {
    throw new Error("Request body is required");
  }
  return JSON.parse(text) as T;
}

export async function POST(request: Request, context: { params: Promise<{ comicId: string }> }) {
  const backendUrl = process.env.BACKEND_D1_SAAS_URL;
  const allowDevFallback = process.env.ENABLE_LOCAL_DEV_FALLBACK === "true";
  const isBackendConfigured = Boolean(backendUrl);
  if (!isBackendConfigured && (process.env.NODE_ENV === "production" || !allowDevFallback)) {
    return NextResponse.json({ error: "D1 SaaS backend is not configured" }, { status: 500 });
  }

  const { comicId } = await context.params;

  try {
    const body = await readJsonBody<{
      storyId: string;
      tenantKey: string;
      chapterNumber: number;
      title: string;
      content: unknown;
    }>(request);

    if (!body.storyId || !body.tenantKey) {
      return NextResponse.json({ error: "storyId and tenantKey are required" }, { status: 400 });
    }

    if (isBackendConfigured) {
      const chapterResponse = await fetch(
        `${backendUrl}/tenants/${comicId}/stories/${body.storyId}/chapters`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-Key": String(body.tenantKey),
          },
          body: JSON.stringify({
            chapter_number: body.chapterNumber,
            title: body.title,
            content: body.content,
          }),
        },
      );

      const chapterData = (await chapterResponse.json()) as { chapter?: unknown; error?: string };
      if (!chapterResponse.ok || chapterData.error || !chapterData.chapter) {
        return NextResponse.json(
          { error: chapterData.error || `HTTP ${chapterResponse.status}` },
          { status: chapterResponse.status },
        );
      }

      return NextResponse.json({ chapter: chapterData.chapter }, { status: 201 });
    }

    // Dev fallback when backend is not configured: synthesize a chapter object
    const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `dev-ch-${Date.now()}`;
    const now = new Date().toISOString();
    const chapter = {
      id,
      story_id: body.storyId,
      chapter_number: body.chapterNumber,
      title: body.title,
      content: body.content,
      view_count: 0,
      created_at: now,
      updated_at: now,
    };

    return NextResponse.json({ chapter }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}