// @ts-nocheck
// This edge function provides an MVP admin endpoint for creating stories with service-level validation.
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
  const title = payload?.title;
  const authorId = payload?.authorId;
  const categoryId = payload?.categoryId;

  if (typeof title !== "string" || !title.trim()) {
    return jsonResponse({ error: "title is required" }, 400);
  }

  if (typeof authorId !== "string" || !authorId.trim()) {
    return jsonResponse({ error: "authorId is required" }, 400);
  }

  if (typeof categoryId !== "string" || !categoryId.trim()) {
    return jsonResponse({ error: "categoryId is required" }, 400);
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

  const [{ data: authorRecord, error: authorError }, { data: categoryRecord, error: categoryError }] = await Promise.all([
    supabase.from("authors").select("id,name").eq("id", authorId).maybeSingle(),
    supabase.from("categories").select("id,name").eq("id", categoryId).maybeSingle(),
  ]);

  if (authorError || !authorRecord) {
    return jsonResponse({ error: "Author does not exist" }, 400);
  }

  if (categoryError || !categoryRecord) {
    return jsonResponse({ error: "Category does not exist" }, 400);
  }

  const { data, error } = await supabase
    .from("stories")
    .insert([
      {
        title: title.trim(),
        author: authorRecord.name,
        author_id: authorRecord.id,
        description: typeof payload?.description === "string" ? payload.description.trim() : null,
        cover_url: typeof payload?.cover_url === "string" ? payload.cover_url.trim() : null,
        category: categoryRecord.name,
        category_id: categoryRecord.id,
        status: payload?.status ?? "draft",
        created_by: verifiedUser.userId,
      },
    ])
    .select("*")
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ story: data }, 200);
});
