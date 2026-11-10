// Redis-style atomic counter Durable Object without external SDK dependencies
// Ponytail: minimal, direct SQLite storage, zero dependencies

export class CounterDO {
  state: DurableObjectState;
  storage: DurableObjectStorage;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const type = url.searchParams.get('type') || 'view'; // view, like, bookmark, comment
    const entityId = url.searchParams.get('id');

    if ((path === '/increment' || request.method === 'POST') && entityId) {
      const key = `count:${type}:${entityId}`;
      const current = (await this.storage.get<number>(key)) || 0;
      const next = current + 1;
      await this.storage.put(key, next);
      return new Response(JSON.stringify({ [type]: next }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if ((path === '/get' || request.method === 'GET') && entityId) {
      const key = `count:${type}:${entityId}`;
      const current = (await this.storage.get<number>(key)) || 0;
      return new Response(JSON.stringify({ [type]: current }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // fallback to legacy single counter for backward compatibility
    if (path === '/increment' || request.method === 'POST') {
      const current = (await this.storage.get<number>('count')) || 0;
      const next = current + 1;
      await this.storage.put('count', next);
      return new Response(JSON.stringify({ count: next }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (path === '/get' || request.method === 'GET') {
      const current = (await this.storage.get<number>('count')) || 0;
      return new Response(JSON.stringify({ count: current }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}

