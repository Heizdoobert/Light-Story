export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // ponytail: Next dev attaches per-request close listeners to ServerResponse
    // (count stable at 11, not a leak); raise Node's warn threshold to silence.
    (await import('node:http')).ServerResponse.prototype.setMaxListeners(20);
  }
}

/**
 * Next.js 16 centralized server error instrumentation hook.
 * Captures unhandled server errors across RSC renders, Server Actions, and API routes.
 */
export async function onRequestError(
  err: { digest?: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string | string[] | undefined };
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
    renderSource?: 'react-server-components' | 'react-server-components-payload' | 'server-rendering';
  },
) {
  try {
    const { logger } = await import('@/sdk/logger');
    const reqHeaderId = request.headers['x-request-id'] || request.headers['X-Request-Id'];
    const requestId = (Array.isArray(reqHeaderId) ? reqHeaderId[0] : reqHeaderId) || err.digest || 'unknown';

    logger.error(err.message || 'Next.js Server Request Error', {
      service: 'nextjs-server',
      error: err,
      requestId,
      metadata: {
        path: request.path,
        method: request.method,
        digest: err.digest,
        routePath: context.routePath,
        routeType: context.routeType,
        routerKind: context.routerKind,
      },
    });
  } catch {
    // Instrumentation error handler must never crash the server
  }
}
