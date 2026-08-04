import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ADMIN_ROLES = ["superadmin", "admin", "employee"];

function addSecurityHeaders(res: NextResponse): NextResponse {
  const isDev = process.env.NODE_ENV === "development";
  const r2Domain = process.env.R2_CLOUDFLARE_STORAGE_DOMAIN;
  const workerDomain = process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION;
  const csp = isDev
    ? `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://${r2Domain} https://placehold.co; connect-src 'self' http://localhost:* https://*.supabase.co wss://*.supabase.co https://va.vercel.com ${workerDomain}; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`
    : `default-src 'self'; script-src 'self' 'unsafe-inline' https://va.vercel.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://${r2Domain} https://placehold.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://va.vercel.com ${workerDomain}; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`;
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  return res;
}

async function refreshSession(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next();
  response = addSecurityHeaders(response);

  const user = await refreshSession(request, response);

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(
        new URL("/handle-exception/401", request.url),
      );
    }

    let role = (user.app_metadata?.role || user.user_metadata?.role || "")
      .toString()
      .trim()
      .toLowerCase();

    if (!ADMIN_ROLES.includes(role)) {
      return NextResponse.redirect(
        new URL("/handle-exception/403", request.url),
      );
    }
  }

  if (
    pathname.startsWith("/user") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile")
  ) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
