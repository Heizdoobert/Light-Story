// @ts-nocheck
// This edge function provides an MVP admin endpoint for creating chapters with ordering safeguards.
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verifySupabaseBearerToken } from "../_shared/jwt.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Missing Supabase environment configuration" }, 500);
  }

  const payload = await req.json().catch(() => null);
  const storyId = payload?.story_id;
  const chapterNumber = payload?.chapter_number;
  const title = payload?.title;
  const content = payload?.content;

  if (
    typeof storyId !== "string" ||
    typeof title !== "string" ||
    typeof content !== "string" ||
    !storyId.trim() ||
    !title.trim() ||
    !content.trim()
  ) {
    return jsonResponse({ error: "story_id, title, and content are required" }, 400);
  }

  const parsedChapterNumber = Number(chapterNumber);
  if (!Number.isInteger(parsedChapterNumber) || parsedChapterNumber <= 0) {
    return jsonResponse({ error: "chapter_number must be a positive integer" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  let verifiedUser;

  try {
    verifiedUser = await verifySupabaseBearerToken(req);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unauthorized" }, 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", verifiedUser.userId)
    .single();

  if (profileError) {
    return jsonResponse({ error: "Unable to load user profile" }, 403);
  }

  const isStaff = ["superadmin", "admin", "employee"].includes(String(profile?.role ?? ""));
  if (!isStaff) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const { data, error } = await supabase
    .from("chapters")
    .insert([
      {
        story_id: storyId.trim(),
        chapter_number: parsedChapterNumber,
        title: title.trim(),
        content: content.trim(),
      },
    ])
    .select("id,story_id,chapter_number,title")
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ chapter: data }, 200);
});
