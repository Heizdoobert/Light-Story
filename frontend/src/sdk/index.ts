export * from '@light-story/sdk';
export * from './cloudflare/kv/kvClient';
export * from './cloudflare/r2/r2Client';
export * from './gateway';
export * from './logger';
export * from './supabaseClient';
export * from './task/api/shared';
export * from './task/types/taskTypes';
export * from './task/validation/taskValidation';

// GatewayClient alias and singleton for tests/apps
import { GatewayHttpClient } from './gateway/client/gatewayHttpClient';
export { GatewayHttpClient as GatewayClient };
export const gatewaySdk = new GatewayHttpClient();
export const createGatewayClient = (config?: any) => new GatewayHttpClient(config);

// Test export
export const someExport = 'sdk-test';
