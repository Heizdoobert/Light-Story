import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up to 20 virtual users
    { duration: '1m', target: 50 },   // Stress at 50 virtual users
    { duration: '30s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests must complete under 1s
    http_req_failed: ['rate<0.01'],    // Error rate must stay below 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8787';
const TOKEN = __ENV.TOKEN || '';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
  };

  // 1. Fetch stories catalog (Single-query pagination + edge cache)
  const storiesRes = http.get(`${BASE_URL}/api/v1/stories?page=1&pageSize=20`, { headers });
  check(storiesRes, {
    'GET /stories 200': (r) => r.status === 200,
    'GET /stories has items': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body?.data?.items || body?.items);
      } catch {
        return false;
      }
    },
  });

  // 2. Fetch categories (Cached 600s)
  const catRes = http.get(`${BASE_URL}/api/v1/categories`, { headers });
  check(catRes, {
    'GET /categories 200': (r) => r.status === 200,
  });

  // 3. Record story view (KV-buffered hot counter)
  let storyId = 'sample-story-id';
  try {
    const body = JSON.parse(storiesRes.body);
    const items = body?.data?.items || body?.items;
    if (items && items.length > 0 && items[0]?.id) {
      storyId = items[0].id;
    }
  } catch {
    // fallback
  }

  const viewRes = http.post(
    `${BASE_URL}/api/v1/stories/views`,
    JSON.stringify({ storyId }),
    { headers },
  );
  check(viewRes, {
    'POST /stories/views ok': (r) => r.status === 200 || r.status === 204,
  });

  sleep(0.2);
}
