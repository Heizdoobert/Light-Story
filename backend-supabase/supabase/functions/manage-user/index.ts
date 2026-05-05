// @ts-nocheck
// Superadmin-only admin endpoint for creating and deleting users.
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

function isValidRole(value: unknown): value is "superadmin" | "admin" | "employee" | "user" {
  return value === "superadmin" || value === "admin" || value === "employee" || value === "user";
}

function isCreatableRole(value: unknown): value is "admin" | "employee" | "user" {
  return value === "admin" || value === "employee" || value === "user";
}

async function writeAuditLog(
  supabase: ReturnType<typeof createClient>,
  payload: {
    actorUserId: string;
    action: "user_create" | "user_delete";
    targetUserId?: string | null;
    targetEmail?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    await supabase.from("admin_audit_logs").insert({
      actor_user_id: payload.actorUserId,
      action: payload.action,
      target_user_id: payload.targetUserId ?? null,
      target_email: payload.targetEmail ?? null,
      metadata: payload.metadata ?? {},
    });
  } catch (_error) {
    // Audit logging should not block the primary admin operation.
  }
}

async function verifySupabaseRequestUser(
  supabase: ReturnType<typeof createClient>,
  request: Request,
) {
  const authHeader = request.headers.get("Authorization") ?? "";

  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Missing bearer token");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw new Error("Invalid bearer token");
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    throw new Error(error.message || "Unauthorized");
  }

  const userId = data.user?.id ?? "";
  if (!userId) {
    throw new Error("Invalid JWT payload");
  }

  return {
    userId,
    email: data.user?.email ?? null,
  };
}

serve(async (req) => {
  try {
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
    const action = payload?.action;

    if (action !== "create" && action !== "delete") {
      return jsonResponse({ error: "action must be one of: create, delete" }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    let verifiedUser;

    try {
      verifiedUser = await verifySupabaseRequestUser(supabase, req);
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

    if (action === "create") {
          if (profile?.role !== "superadmin" && profile?.role !== "admin") {
            return jsonResponse({ error: "Forbidden" }, 403);
          }

      const email = payload?.email;
      const password = payload?.password;
      const role = payload?.role;
      const fullName = payload?.fullName;

          const creatableRoles = profile?.role === "admin"
            ? new Set(["user", "employee"])
            : new Set(["user", "employee", "admin"]);

      if (typeof email !== "string" || !email.trim()) {
        return jsonResponse({ error: "email is required" }, 400);
      }

      if (typeof password !== "string" || password.trim().length < 6) {
        return jsonResponse({ error: "password must be at least 6 characters" }, 400);
      }

      if (!isValidRole(role)) {
        return jsonResponse({ error: "invalid role" }, 400);
      }

      if (!isCreatableRole(role)) {
        return jsonResponse({ error: "role is not allowed for creation" }, 400);
      }

      if (!creatableRoles.has(role)) {
        return jsonResponse({ error: "role is not allowed for your account type" }, 403);
      }

      let created;
      try {
        const result = await supabase.auth.admin.createUser({
          email: email.trim(),
          password,
          email_confirm: true,
          user_metadata: {
            full_name: typeof fullName === "string" ? fullName.trim() : undefined,
          },
        });
        created = result.data;
        if (result.error) {
          console.error("manage-user createUser error:", result.error);
          return jsonResponse({ error: `createUser failed: ${result.error.message}` }, 500);
        }
      } catch (error) {
        console.error("manage-user createUser exception:", error);
        return jsonResponse({
          error: `createUser exception: ${error instanceof Error ? error.message : String(error)}`,
        }, 500);
      }

      if (!created?.user?.id) {
        return jsonResponse({ error: "createUser returned no user id" }, 500);
      }

      const userId = created.user.id;

      const { error: profileUpsertError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          email: email.trim(),
          full_name: typeof fullName === "string" && fullName.trim() ? fullName.trim() : null,
          role,
        });

      if (profileUpsertError) {
        console.error("manage-user profile upsert error:", profileUpsertError);
        await supabase.auth.admin.deleteUser(userId);
        return jsonResponse({ error: `profile upsert failed: ${profileUpsertError.message}` }, 500);
      }

      try {
        await writeAuditLog(supabase, {
          actorUserId: verifiedUser.userId,
          action: "user_create",
          targetUserId: userId,
          targetEmail: email.trim(),
          metadata: {
            assignedRole: role,
          },
        });
      } catch (error) {
        console.error("manage-user audit log error:", error);
        return jsonResponse({
          error: `audit log failed: ${error instanceof Error ? error.message : String(error)}`,
        }, 500);
      }

      return jsonResponse({ userId, email: email.trim(), role }, 200);
    }

    if (profile?.role !== "superadmin") {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const userId = payload?.userId;
    const targetEmail = typeof payload?.targetEmail === "string" ? payload.targetEmail.trim() : null;
    if (typeof userId !== "string" || !userId.trim()) {
      return jsonResponse({ error: "userId is required" }, 400);
    }

    if (userId === verifiedUser.userId) {
      return jsonResponse({ error: "You cannot delete your own account" }, 400);
    }

    const targetUserId = userId.trim();
    const banUntil = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();

    const { error: banError } = await supabase.auth.admin.updateUserById(targetUserId, {
      banned_until: banUntil,
    });

    if (banError) {
      console.warn("manage-user ban before delete failed:", banError);
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUserId, true);
    if (deleteError) {
      console.error("manage-user deleteUser error:", deleteError);
      return jsonResponse({ error: deleteError.message }, 500);
    }

    await writeAuditLog(supabase, {
      actorUserId: verifiedUser.userId,
      action: "user_delete",
      targetUserId,
      targetEmail,
    });

    return jsonResponse({ deleted: true, userId: targetUserId }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unhandled error in manage-user:", message, err);
    return jsonResponse({ error: `Internal error: ${message}` }, 500);
  }
});
