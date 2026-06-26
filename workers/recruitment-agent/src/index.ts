import { RecruitmentAgent } from "./agent";
import type { Env } from "./types";

export { RecruitmentAgent };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (path === "/api/recruitment/health" && method === "GET") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const inviteMatch = path.match(/^\/api\/recruitment\/invite\/([^/]+)$/);
    if (inviteMatch && method === "POST") {
      const inviteCode = inviteMatch[1];
      await request.json().catch(() => ({}));
      return new Response(JSON.stringify({ ok: true, inviteCode }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const adminMatch = path.match(/^\/api\/recruitment\/admin\/([a-fA-F0-9-]+)(\/.*)?$/);
    if (!adminMatch) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const adminId = adminMatch[1];
    const agentId = env.RecruitmentAgent.idFromName(adminId);
    const stub = env.RecruitmentAgent.get(agentId);

    const response = await stub.fetch(request);
    return response;
  },
};
