import { ROUTES } from "@/lib/constants/routes";

const UPLOAD_TIMEOUT_MS = 60_000;

export async function uploadToR2(
  file: File,
  folder = "chapters",
): Promise<{ success: boolean; url?: string; error?: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const post = (signal?: AbortSignal) =>
    fetch(ROUTES.API.R2_UPLOAD, {
      method: "POST",
      body: formData,
      signal,
    });

  let res: Response;
  try {
    res = await post(AbortSignal.timeout(UPLOAD_TIMEOUT_MS));
  } catch (error) {
    // Network error or timeout — retry once; 4xx/5xx never retried
    try {
      res = await post(AbortSignal.timeout(UPLOAD_TIMEOUT_MS));
    } catch {
      return { success: false, error: `Upload network error: ${(error as Error).message}` };
    }
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 200);
    } catch {
      // ignore body read failure
    }
    return { success: false, error: `Upload failed (${res.status})${detail ? `: ${detail}` : ""}` };
  }

  const data = (await res.json()) as { url?: string; key?: string };
  return { success: true, url: data.url || data.key };
}
