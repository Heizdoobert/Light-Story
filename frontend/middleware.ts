import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ROUTES } from "@/lib/constants/routes";

const ADMIN_ROLES = ["superadmin", "admin", "employee"];

function addSecurityHeaders(res: NextResponse, isDev: boolean): NextResponse {
  const r2Domain = process.env.R2_CLOUDFLARE_STORAGE_DOMAIN || "*.r2.cloudflarestorage.com";
  const workerDomain = process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION || "https://kv-worker.hhhuygiau.workers.dev";
  
  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://va.vercel.com https://pagead2.googlesyndication.com https://*.googlesyndication.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https://${r2Domain} https://placehold.co https://*.googlesyndication.com ${workerDomain};
    connect-src 'self' http://localhost:* https://*.supabase.co wss://*.supabase.co https://va.vercel.com ${workerDomain} ${isDev ? "ws: wss:" : ""};
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  `.replace(/\s{2,}/g, " ").trim();

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  
  return res;
}

export async function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  const pathname = request.nextUrl.pathname;

  const isAdminPath = pathname.startsWith(ROUTES.ADMIN.ROOT);
  const isUserPath = pathname.startsWith(ROUTES.USER.ROOT);

  // Public routes: headers only — skip the Supabase auth round-trip
  if (!isAdminPath && !isUserPath) {
    return addSecurityHeaders(NextResponse.next(), isDev);
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (isAdminPath) {
      return addSecurityHeaders(
        NextResponse.redirect(new URL(ROUTES.ERROR.UNAUTHORIZED, request.url)),
        isDev
      );
    }
    return addSecurityHeaders(response, isDev);
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();

  // Admin route protection
  if (isAdminPath) {
    if (error || !user) {
      const url = request.nextUrl.clone();
      url.pathname = ROUTES.ERROR.UNAUTHORIZED;
      return addSecurityHeaders(NextResponse.redirect(url), isDev);
    }

    let role = (
      user.app_metadata?.role ||
      user.user_metadata?.role ||
      ""
    ).toString().trim().toLowerCase();

    // Fallback: DB check
    if (!ADMIN_ROLES.includes(role)) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role) {
        role = profile.role.toString().trim().toLowerCase();
      }
    }

    if (!ADMIN_ROLES.includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = ROUTES.ERROR.FORBIDDEN;
      return addSecurityHeaders(NextResponse.redirect(url), isDev);
    }
  }

  // User route protection
  if (isUserPath) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = ROUTES.LOGIN;
      return addSecurityHeaders(NextResponse.redirect(url), isDev);
    }
  }

  return addSecurityHeaders(response, isDev);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
