import { RequestOptions } from './types';

export type InterceptorEjector = () => void;

export interface RequestContext extends RequestOptions {
  url: string;
  method: string;
}

export type RequestInterceptor = (
  context: RequestContext,
) => Promise<RequestContext | Partial<RequestContext> | void> | RequestContext | Partial<RequestContext> | void;

export type ResponseInterceptor = (
  response: Response,
  data: unknown,
) => Promise<unknown> | unknown;

export class InterceptorManager<T> {
  private handlers: Array<T | null> = [];

  /**
   * Register an interceptor. Returns an eject function to unsubscribe.
   */
  public use(handler: T): InterceptorEjector {
    this.handlers.push(handler);
    const index = this.handlers.length - 1;
    return () => {
      this.handlers[index] = null;
    };
  }

  /**
   * Run all active handlers sequentially in an async pipeline.
   */
  public async runPipeline<Ctx>(
    initial: Ctx,
    fn: (ctx: Ctx, handler: T) => Promise<Ctx> | Ctx,
  ): Promise<Ctx> {
    let acc = initial;
    // Snapshot handlers to prevent mutation issues during active run
    const active = [...this.handlers];
    for (const h of active) {
      if (h !== null) {
        acc = await fn(acc, h);
      }
    }
    return acc;
  }

  /**
   * Clear all registered interceptors.
   */
  public clear(): void {
    this.handlers.length = 0;
  }
}

export interface Interceptors {
  request: InterceptorManager<RequestInterceptor>;
  response: InterceptorManager<ResponseInterceptor>;
}

export function createInterceptors(): Interceptors {
  return {
    request: new InterceptorManager<RequestInterceptor>(),
    response: new InterceptorManager<ResponseInterceptor>(),
  };
}
