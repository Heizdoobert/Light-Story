// @ts-nocheck
// This edge function provides an MVP admin endpoint for creating stories with service-level validation.
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing bearer token" }, 401);
  }

  const jwt = authHeader.slice("Bearer ".length).trim();
  if (!jwt) {
    return jsonResponse({ error: "Invalid bearer token" }, 401);
  }

  const payload = await req.json().catch(() => null);
  const title = payload?.title;
  const author = payload?.author;

  if (typeof title !== "string" || typeof author !== "string" || !title.trim() || !author.trim()) {
    return jsonResponse({ error: "title and author are required" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData.user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError) {
    return jsonResponse({ error: "Unable to load user profile" }, 403);
  }

  const isStaff = ["superadmin", "admin", "employee"].includes(String(profile?.role ?? ""));
  if (!isStaff) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const { data, error } = await supabase
    .from("stories")
    .insert([
      {
        title: title.trim(),
        author: author.trim(),
        description: typeof payload?.description === "string" ? payload.description.trim() : null,
        cover_url: typeof payload?.cover_url === "string" ? payload.cover_url.trim() : null,
        category: typeof payload?.category === "string" ? payload.category.trim() : null,
        status: payload?.status ?? "draft",
        created_by: userData.user.id,
      },
    ])
    .select("id,title,author,status")
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ story: data }, 200);
});
