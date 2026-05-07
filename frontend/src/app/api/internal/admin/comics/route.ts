import { NextResponse } from "next/server";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "comic";
}

async function readJsonBody<T>(request: Request): Promise<T> {
  const text = await request.text();
  if (!text.trim()) {
    throw new Error("Request body is required");
  }
  return JSON.parse(text) as T;
}

export async function POST(request: Request) {
  const backendUrl = process.env.BACKEND_D1_SAAS_URL;
  const backendAdminKey = process.env.BACKEND_D1_SAAS_ADMIN_KEY;

  if (!backendUrl || !backendAdminKey) {
    return NextResponse.json({ error: "D1 SaaS backend is not configured" }, { status: 500 });
  }

  try {
    const body = await readJsonBody<{
      title: string;
      slug?: string;
      description?: string;
      coverUrl?: string;
      cover_url?: string;
      author?: string;
      status?: string;
      category?: unknown;
    }>(request);
    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const incomingSlug = typeof body.slug === "string" ? body.slug.trim() : "";
    const slug = incomingSlug || slugify(title);
    const description = body.description ?? "";
    const coverUrl = body.coverUrl ?? body.cover_url ?? "";
    const author = typeof body.author === "string" && body.author.trim() ? body.author.trim() : "Unknown";
    const status = body.status === "completed" ? "completed" : "ongoing";
    const categoryArray = Array.isArray(body.category)
      ? body.category.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];

    const tenantResponse = await fetch(`${backendUrl}/tenants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": backendAdminKey,
      },
      body: JSON.stringify({ name: title }),
    });

    const tenantData = (await tenantResponse.json()) as {
      tenant?: { id: string; name: string };
      tenantKey?: string;
      error?: string;
    };

    if (!tenantResponse.ok || tenantData.error || !tenantData.tenant || !tenantData.tenantKey) {
      return NextResponse.json(
        { error: tenantData.error || `HTTP ${tenantResponse.status}` },
        { status: tenantResponse.status },
      );
    }

    const tenantId = tenantData.tenant.id;
    const tenantKey = tenantData.tenantKey;
    const storyResponse = await fetch(`${backendUrl}/tenants/${tenantId}/stories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Key": tenantKey,
      },
      body: JSON.stringify({
        title,
        slug,
        description,
        cover_url: coverUrl,
        status,
        author,
        category: JSON.stringify(categoryArray),
      }),
    });

    const storyData = (await storyResponse.json()) as {
      story?: {
        id: string;
        title: string;
        slug?: string;
        description?: string | null;
        cover_url?: string | null;
        author?: string | null;
        status?: string | null;
        category?: string | null;
        view_count?: number;
        created_at?: string;
        updated_at?: string;
      };
      error?: string;
    };

    if (!storyResponse.ok || storyData.error || !storyData.story) {
      return NextResponse.json(
        { error: storyData.error || `HTTP ${storyResponse.status}` },
        { status: storyResponse.status },
      );
    }

    let normalizedCategory: string[] = [];
    if (typeof storyData.story.category === "string" && storyData.story.category.trim()) {
      try {
        const parsed = JSON.parse(storyData.story.category);
        if (Array.isArray(parsed)) {
          normalizedCategory = parsed.filter((item): item is string => typeof item === "string");
        }
      } catch {
        normalizedCategory = categoryArray;
      }
    } else {
      normalizedCategory = categoryArray;
    }

    return NextResponse.json(
      {
        comic: {
          id: tenantId,
          tenantKey,
          storyId: storyData.story.id,
          title: storyData.story.title,
          slug: storyData.story.slug ?? slug,
          description: storyData.story.description ?? description,
          author: storyData.story.author ?? author,
          status: storyData.story.status === "completed" ? "completed" : status,
          category: normalizedCategory,
          viewCount: Number(storyData.story.view_count ?? 0),
          coverUrl: storyData.story.cover_url ?? coverUrl,
          createdAt: storyData.story.created_at,
          updatedAt: storyData.story.updated_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}