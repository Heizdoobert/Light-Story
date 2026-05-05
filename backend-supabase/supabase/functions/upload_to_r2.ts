import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { R2 } from "https://deno.land/x/supabase@0.7.0/mod.ts";

const r2 = new R2({
  accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
  secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
});

serve(async (req) => {
  const form = await req.formData();
  const bucketName = req.headers.get("x-r2-bucket")!;
  const bucket = r2.bucket(bucketName);

  const urls: string[] = [];
  for (const [, file] of form.entries()) {
    if (!(file instanceof File)) continue;
    const key = `${crypto.randomUUID()}_${file.name}`;
    await bucket.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });
    const url = `https://${bucketName}.r2.cloudflarestorage.com/${key}`;
    urls.push(url);
  }

  return new Response(JSON.stringify({ urls }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});