import { GatewayHttpClient } from './gateway/client/gatewayHttpClient';

// Compatibility barrel for gateway SDK exports
export * from './gateway/index';
export { GatewayHttpClient, GatewayHttpClient as GatewayClient };
export const createGatewayClient = (config?: any) => new GatewayHttpClient(config);
