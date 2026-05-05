import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY");
const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID");

serve(async (req) => {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID) {
    return new Response(
      JSON.stringify({ error: "Missing R2 credentials in environment" }),
      { status: 500 }
    );
  }

  const form = await req.formData();
  const bucketName = req.headers.get("x-r2-bucket");
  if (!bucketName) {
    return new Response(
      JSON.stringify({ error: "Missing x-r2-bucket header" }),
      { status: 400 }
    );
  }

  const urls: string[] = [];
  const errors: string[] = [];

  for (const [, file] of form.entries()) {
    if (!(file instanceof File)) continue;

    try {
      const buffer = await file.arrayBuffer();
      const key = `${crypto.randomUUID()}_${file.name}`;
      const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      const url = new URL(
        `https://${bucketName}.r2.cloudflarestorage.com/${key}`
      );

      // Simple PUT request to R2 with credentials in Auth header
      const authHeader = btoa(
        `${R2_ACCESS_KEY_ID}:${R2_SECRET_ACCESS_KEY}`
      );
      
      const response = await fetch(`${endpoint}/${bucketName}/${key}`, {
        method: "PUT",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: buffer,
      });

      if (!response.ok) {
        errors.push(
          `Failed to upload ${file.name}: ${response.status} ${response.statusText}`
        );
        continue;
      }

      urls.push(url.toString());
    } catch (e) {
      errors.push(`Error uploading ${file.name}: ${e.message}`);
    }
  }

  return new Response(JSON.stringify({ urls, errors }), {
    status: errors.length === 0 && urls.length > 0 ? 200 : 207,
    headers: { "Content-Type": "application/json" },
  });
});