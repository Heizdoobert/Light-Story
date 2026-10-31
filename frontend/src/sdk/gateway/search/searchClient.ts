import { SearchClient, type SearchPageResult, type StoryItem, HttpClient } from '@light-story/sdk';
import { getGatewayUrl } from '@/lib/utils/gateway-url';

export { SearchClient, type SearchPageResult, type StoryItem };

export const searchClient = new SearchClient(new HttpClient({ baseUrl: getGatewayUrl() }));
