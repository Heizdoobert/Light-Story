import { GatewayHttpClient } from './client/gatewayHttpClient';

// Re-export SDK gateway modules
export * from './admin/adminClient';
export * from './analytics/analyticsClient';
export * from './chapters/chaptersClient';
export * from './client/gatewayHttpClient';
export * from './comics/comicsClient';
export * from './comments/commentsClient';
export * from './errors/errorsClient';
export * from './errors/gatewayError';
export * from './health/healthClient';
export * from './r2/r2Client';
export * from './search/searchClient';
export * from './stories/storiesClient';
export * from './types/gatewayTypes';
export * from './user/userClient';

export { GatewayHttpClient as GatewayClient };
export const createGatewayClient = (config?: any) => new GatewayHttpClient(config);
