export default {
  async fetch(request: Request): Promise<Response> {
    return new Response(JSON.stringify({ status: 'ok', worker: 'admin-worker' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
