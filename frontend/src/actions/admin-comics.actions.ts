"use server";

import { z } from "zod";
import { revalidateTag } from "next/cache";
import { act } from "@/actions/result";
import type { ActionResult } from "@/actions/result";
import { fetchApi, messageFromResponse } from "@/actions/http";

const comicStatusSchema = z.enum([
  "draft",
  "published",
  "ongoing",
  "completed",
  "archived",
]);

const createComicFromMetadataSchema = z.object({
  title: z.string().min(1),
  author: z.string(),
  description: z.string(),
  status: comicStatusSchema,
  coverUrl: z.string().optional(),
});

const updateComicRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  author: z.string(),
  description: z.string(),
  status: comicStatusSchema,
  coverUrl: z.string(),
});

const deleteComicSchema = z.object({
  id: z.string().min(1),
});

const deleteComicChapterSchema = z.object({
  comicId: z.string().min(1),
  chapterId: z.string().min(1),
});

const recordComicAuditSchema = z.object({
  action: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

const createChapterSchema = z.object({
  story_id: z.string().min(1),
  title: z.string(),
  chapter_number: z.number().int().min(1).optional(),
});

const updateChapterImagesSchema = z.object({
  chapterId: z.string().min(1),
  content: z.array(z.object({ src: z.string(), alt: z.string() })),
});

export async function updateChapterImagesAction(
  input: z.infer<typeof updateChapterImagesSchema>,
): Promise<ActionResult> {
  return act(
    updateChapterImagesSchema,
    input,
    async ({ chapterId, content }) => {
      const res = await fetchApi("/api/admin/chapter", {
        method: "PUT",
        body: JSON.stringify({ chapterId, content }),
      });
      if (!res.ok) {
        return { ok: false, error: await messageFromResponse(res) };
      }
      revalidateTag("comics", "max");
      return { ok: true, data: await res.json() };
    },
  );
}

export async function createComicFromMetadata(
  input: z.infer<typeof createComicFromMetadataSchema>,
): Promise<ActionResult> {
  return act(
    createComicFromMetadataSchema,
    input,
    async ({ title, author, description, status, coverUrl }) => {
      const res = await fetchApi("/api/admin/comics", {
        method: "POST",
        body: JSON.stringify({
          title,
          author: author || "Unknown",
          description,
          status: status || "draft",
          coverUrl,
        }),
      });
      if (!res.ok) {
        return { ok: false, error: await messageFromResponse(res) };
      }
      revalidateTag("comics", "max");
      revalidateTag("admin-dashboard-metrics", "max");
      return { ok: true, data: await res.json() };
    },
  );
}

export async function updateComicRecord(
  input: z.infer<typeof updateComicRecordSchema>,
): Promise<ActionResult> {
  return act(
    updateComicRecordSchema,
    input,
    async ({ id, title, author, description, status, coverUrl }) => {
      const res = await fetchApi(`/api/admin/comics/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title, author, description, status, coverUrl }),
      });
      if (!res.ok) {
        return { ok: false, error: await messageFromResponse(res) };
      }
      revalidateTag("comics", "max");
      revalidateTag("admin-dashboard-metrics", "max");
      return { ok: true, data: await res.json() };
    },
  );
}

export async function deleteComic(
  input: z.infer<typeof deleteComicSchema>,
): Promise<ActionResult> {
  return act(deleteComicSchema, input, async ({ id }) => {
    const res = await fetchApi(`/api/admin/comics/${id}`, { method: "DELETE" });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag("comics", "max");
    revalidateTag("admin-dashboard-metrics", "max");
    return { ok: true };
  });
}

export async function deleteComicChapter(
  input: z.infer<typeof deleteComicChapterSchema>,
): Promise<ActionResult> {
  return act(
    deleteComicChapterSchema,
    input,
    async ({ comicId, chapterId }) => {
      const res = await fetchApi(
        `/api/admin/comics/${comicId}/chapters/${chapterId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        return { ok: false, error: await messageFromResponse(res) };
      }
      revalidateTag("comics", "max");
      revalidateTag("admin-dashboard-metrics", "max");
      return { ok: true };
    },
  );
}

export async function recordComicAudit(
  input: z.infer<typeof recordComicAuditSchema>,
): Promise<ActionResult> {
  return act(
    recordComicAuditSchema,
    input,
    async ({ action, metadata, entityType, entityId }) => {
      const res = await fetchApi("/api/admin/audit", {
        method: "POST",
        body: JSON.stringify({
          action,
          metadata,
          entity_type: entityType ?? "comic",
          entity_id: entityId,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        return { ok: false, error: await messageFromResponse(res) };
      }
      return { ok: true };
    },
  );
}

export async function createChapter(
  input: z.infer<typeof createChapterSchema>,
): Promise<ActionResult> {
  return act(
    createChapterSchema,
    input,
    async ({ story_id, title, chapter_number }) => {
      const res = await fetchApi("/api/admin/chapters", {
        method: "POST",
        body: JSON.stringify({ story_id, title, chapter_number }),
      });
      if (!res.ok) {
        return { ok: false, error: await messageFromResponse(res) };
      }
      revalidateTag("comics", "max");
      revalidateTag("admin-dashboard-metrics", "max");
      return { ok: true, data: await res.json() };
    },
  );
}

export async function updateChapterImages(
  input: z.infer<typeof updateChapterImagesSchema>,
): Promise<ActionResult> {
  return act(
    updateChapterImagesSchema,
    input,
    async ({ chapterId, content }) => {
      const res = await fetchApi(`/api/admin/chapters/${chapterId}/images`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        return { ok: false, error: await messageFromResponse(res) };
      }
      revalidateTag("comics", "max");
      revalidateTag("admin-dashboard-metrics", "max");
      return { ok: true, data: await res.json() };
    },
  );
}
