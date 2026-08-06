import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ROUTES } from "@/lib/constants/routes";

const ADMIN_ROLES = ["superadmin", "admin", "employee", "internal"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Rule 4: RBAC Check for /admin/*
  if (pathname.startsWith(ROUTES.ADMIN.ROOT)) {
    const role =
      typeof user?.app_metadata?.role === "string"
        ? user.app_metadata.role
        : null;

    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = ROUTES.ERROR.UNAUTHORIZED;
      return NextResponse.redirect(url);
    }
    if (!role || !ADMIN_ROLES.includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = ROUTES.ERROR.FORBIDDEN;
      return NextResponse.redirect(url);
    }
  }

  // Rule 4: Auth Check for /user/*
  if (pathname.startsWith(ROUTES.USER.ROOT)) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = ROUTES.LOGIN;
      return NextResponse.redirect(url);
    }
  }

  // Rule 6: Content-Security-Policy Security Header
  const isDev = process.env.NODE_ENV === "development";
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    connect-src 'self' https: ${isDev ? "ws: wss:" : ""};
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
