import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const ADMIN_ROLES = ['superadmin', 'admin', 'employee'];

function addSecurityHeaders(res: NextResponse): NextResponse {
  const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.r2.cloudflarestorage.com; connect-src 'self' http://localhost:* https://*.supabase.co wss://*.supabase.co; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';";
  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin route protection — server-side guard before page loads
  if (pathname.startsWith('/admin')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // ponytail: no env vars → block admin access, don't fail open
      return addSecurityHeaders(
        NextResponse.redirect(new URL('/handle-exception/401', request.url))
      );
    }

    let response = NextResponse.next();

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

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return addSecurityHeaders(
        NextResponse.redirect(new URL('/handle-exception/401', request.url))
      );
    }

    const role = (
      user.app_metadata?.role ||
      user.user_metadata?.role ||
      ''
    ).toString().trim().toLowerCase();

    if (!ADMIN_ROLES.includes(role)) {
      return addSecurityHeaders(
        NextResponse.redirect(new URL('/handle-exception/403', request.url))
      );
    }

    return addSecurityHeaders(response);
  }

  // All other routes — CSP headers only
  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
