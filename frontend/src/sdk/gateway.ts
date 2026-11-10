import { GatewayHttpClient } from './gateway/client/gatewayHttpClient';
import type { ClientConfig } from '@light-story/sdk';

// Compatibility barrel for gateway SDK exports
export * from './gateway/index';
export { GatewayHttpClient, GatewayHttpClient as GatewayClient };
export const createGatewayClient = (config?: ClientConfig) => new GatewayHttpClient(config);
