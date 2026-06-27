import { Agent, callable } from "agents";
import type { Connection } from "agents";
import type { AgentState, Candidate, ScoutSession, Decision, Invite, Evaluation, SourcePlatform, Env } from "./types";
import { SupabaseSync } from "./supabase-sync";
import { ScoutScheduler } from "./scout";
import { CreatorEvaluator } from "./evaluator";

export class RecruitmentAgent extends Agent<Env, AgentState> {
  private dbSync = new SupabaseSync(this.env);
  private scoutScheduler = new ScoutScheduler(this.env);
  private evaluator = new CreatorEvaluator(this.env);

  initialState: AgentState = {
    adminId: "",
    scoutSessions: [],
    pendingCandidates: [],
    evaluatedCandidates: [],
    decisions: [],
    invites: [],
    lastCronRun: 0,
  };

  validateStateChange(nextState: AgentState, source: Connection | "server") {
    if (this.state.adminId && nextState.adminId !== this.state.adminId) {
      throw new Error("adminId cannot change after initialization");
    }
  }

  onStateUpdate(state: AgentState, source: Connection | "server") {
    console.log(`[RecruitmentAgent ${state.adminId}] state updated`);
    this.dbSync.scheduleSync(state);
  }

  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Extract relative path by stripping /api/recruitment/admin/{adminId} prefix
    const prefix = `/api/recruitment/admin/${this.state.adminId}`;
    const relativePath = path.startsWith(prefix) ? path.slice(prefix.length) || "/" : path;

    if (relativePath === "/dashboard") {
      return new Response(JSON.stringify(this.state), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (relativePath === "/candidates") {
      if (method === "GET") {
        return new Response(JSON.stringify({
          pending: this.state.pendingCandidates,
          evaluated: this.state.evaluatedCandidates,
        }), { headers: { "Content-Type": "application/json" } });
      }

      if (method === "POST") {
        try {
          const body = await request.json() as any;
          if (body.url && body.platform) {
            const candidate = await this.addManualUrl(body.url, body.platform);
            return new Response(JSON.stringify(candidate), {
              status: 201,
              headers: { "Content-Type": "application/json" },
            });
          }
        } catch { /* fall through */ }
      }
    }

    if (relativePath === "/scout" && method === "POST") {
      try {
        const body = await request.json() as any;
        if (body.platform && body.query) {
          return new Response(JSON.stringify({ ok: true, message: "Scout triggered", platform: body.platform, query: body.query }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch { /* fall through */ }
    }

    if (relativePath === "/evaluate" && method === "POST") {
      try {
        const body = await request.json() as any;
        if (body.candidateId) {
          this.queueEvaluation(body.candidateId);
          return new Response(JSON.stringify({ ok: true, message: "Evaluation queued" }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch { /* fall through */ }
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  async alarm(): Promise<void> {
    console.log(`[RecruitmentAgent ${this.state.adminId}] alarm triggered`);

    for (const session of this.state.scoutSessions) {
      if (session.status === "idle") {
        this.queue("scout" as keyof this, session.source);
      }
    }

    this.setState({ ...this.state, lastCronRun: Date.now() });

    await this.schedule(21600, "alarm", undefined, { idempotent: true });
  }

  @callable()
  async initialize(adminId: string): Promise<AgentState> {
    if (!this.state.adminId) {
      this.setState({ ...this.state, adminId });
    }
    return this.state;
  }

  @callable()
  async getDashboard(): Promise<AgentState> {
    return this.state;
  }

  @callable()
  async addManualUrl(url: string, platform: SourcePlatform): Promise<Candidate> {
    const candidate: Candidate = {
      id: crypto.randomUUID(),
      sourceUrl: url,
      sourcePlatform: platform,
      creatorName: "",
      creatorHandle: "",
      followerCount: 0,
      status: "pending",
      createdAt: Date.now(),
    };
    this.setState({
      ...this.state,
      pendingCandidates: [...this.state.pendingCandidates, candidate],
    });
    return candidate;
  }

  @callable()
  async approveCandidate(candidateId: string, notes: string): Promise<void> {
    const candidate = this.findCandidate(candidateId);
    if (!candidate) throw new Error(`Candidate ${candidateId} not found`);
    if (candidate.status === "rejected") throw new Error("Cannot approve rejected candidate");

    const decision: Decision = {
      candidateId,
      action: "approve",
      notes,
      adminId: this.state.adminId,
      createdAt: Date.now(),
    };

    this.setState({
      ...this.state,
      evaluatedCandidates: this.state.evaluatedCandidates.map((c) =>
        c.id === candidateId ? { ...c, status: "approved", adminNotes: notes, decidedAt: Date.now() } : c
      ),
      decisions: [...this.state.decisions, decision],
    });
  }

  @callable()
  async rejectCandidate(candidateId: string, reason: string): Promise<void> {
    const candidate = this.findCandidate(candidateId);
    if (!candidate) throw new Error(`Candidate ${candidateId} not found`);

    const decision: Decision = {
      candidateId,
      action: "reject",
      notes: reason,
      adminId: this.state.adminId,
      createdAt: Date.now(),
    };

    this.setState({
      ...this.state,
      evaluatedCandidates: this.state.evaluatedCandidates.map((c) =>
        c.id === candidateId ? { ...c, status: "rejected", adminNotes: reason, decidedAt: Date.now() } : c
      ),
      decisions: [...this.state.decisions, decision],
    });
  }

  @callable()
  async sendInvite(candidateId: string): Promise<void> {
    const candidate = this.findCandidate(candidateId);
    if (!candidate || candidate.status !== "approved") {
      throw new Error("Candidate must be approved before inviting");
    }

    const inviteCode = `invite_${crypto.randomUUID().slice(0, 8)}`;
    const invite: Invite = {
      candidateId,
      inviteCode,
      status: "sent",
      sentAt: Date.now(),
    };

    this.setState({
      ...this.state,
      evaluatedCandidates: this.state.evaluatedCandidates.map((c) =>
        c.id === candidateId ? { ...c, status: "invited" } : c
      ),
      invites: [...this.state.invites, invite],
    });
  }

  @callable()
  async queueEvaluation(candidateId: string): Promise<void> {
    this.queue("evaluate" as keyof this, candidateId);
  }

  @callable()
  async submitEvaluation(candidateId: string, evaluation: Evaluation): Promise<void> {
    const candidate = this.state.pendingCandidates.find((c) => c.id === candidateId);
    if (!candidate) throw new Error(`Candidate ${candidateId} not found`);

    const evaluated = { ...candidate, evaluation, status: "evaluated" as const, evaluatedAt: Date.now() };

    this.setState({
      ...this.state,
      pendingCandidates: this.state.pendingCandidates.filter((c) => c.id !== candidateId),
      evaluatedCandidates: [...this.state.evaluatedCandidates, evaluated],
    });
  }

  async evaluate(candidateId: string): Promise<void> {
    const candidate = this.findCandidate(candidateId);
    if (!candidate) {
      console.error(`[RecruitmentAgent ${this.state.adminId}] candidate ${candidateId} not found for evaluation`);
      return;
    }

    const evaluation = await this.evaluator.evaluate(candidate);
    await this.submitEvaluation(candidateId, evaluation);
  }

  async scout(platform: SourcePlatform): Promise<void> {
    const sessionIndex = this.state.scoutSessions.findIndex((s) => s.source === platform);
    if (sessionIndex === -1) return;

    // Mark session as running
    const runningSessions = this.state.scoutSessions.map((s, i) =>
      i === sessionIndex ? { ...s, status: "running" as const, lastRunAt: Date.now() } : s
    );
    this.setState({ ...this.state, scoutSessions: runningSessions });

    // Execute search
    const result = await this.scoutScheduler.search(platform, "manga comic art");

    // Update with results
    const updatedSessions = this.state.scoutSessions.map((s, i) =>
      i === sessionIndex
        ? { ...s, status: (result.error ? "error" : "idle") as "idle" | "error", candidatesFound: s.candidatesFound + result.candidates.length, error: result.error }
        : s
    );

    this.setState({
      ...this.state,
      pendingCandidates: [...this.state.pendingCandidates, ...result.candidates],
      scoutSessions: updatedSessions,
    });
  }

  private findCandidate(candidateId: string): Candidate | undefined {
    return (
      this.state.pendingCandidates.find((c) => c.id === candidateId) ??
      this.state.evaluatedCandidates.find((c) => c.id === candidateId)
    );
  }
}
