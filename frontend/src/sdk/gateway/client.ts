import { getGatewayUrl } from '@/lib/utils/gateway-url';
import { HttpClient, ClientConfig } from '@light-story/sdk';

export class GatewayHttpClient extends HttpClient {
  constructor(config: ClientConfig = {}) {
    super(config);
  }

  public override getBaseUrl(): string {
    if (this.config.baseUrl) {
      return this.config.baseUrl.replace(/\/+$/, '');
    }
    return getGatewayUrl().replace(/\/+$/, '');
  }

  protected override async resolveToken(explicitToken?: string | null): Promise<string | null> {
    const resolved = await super.resolveToken(explicitToken);
    if (resolved) {
      return resolved;
    }

    // Attempt browser-side Supabase session lookup if in client environment
    if (typeof window !== 'undefined') {
      try {
        const { supabase } = await import('../supabaseClient');
        const { data } = await supabase.auth.getSession();
        return data?.session?.access_token ?? null;
      } catch {
        return null;
      }
    }
    return null;
  }
}
