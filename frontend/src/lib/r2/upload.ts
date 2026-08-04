export async function uploadToR2(
  file: File,
  folder = "chapters",
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const res = await fetch("/api/r2/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}`);
    }

    const data = (await res.json()) as { url?: string; key?: string };
    return { success: true, url: data.url || data.key };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
