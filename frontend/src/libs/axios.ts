import { fetchApi } from '@/actions/http';

export const apiClient = {
  get: (url: string) => fetchApi(url, { method: 'GET' }),
  post: (url: string, body: any) => fetchApi(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url: string, body: any) => fetchApi(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (url: string) => fetchApi(url, { method: 'DELETE' }),
};

export default apiClient;
