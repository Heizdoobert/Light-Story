import { Agent, callable } from "agents";
import type { Connection } from "agents";
import type { AgentState, Candidate, ScoutSession, Decision, Invite, Evaluation, SourcePlatform, Env } from "./types";

export class RecruitmentAgent extends Agent<Env, AgentState> {
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

  private evaluate(candidateId: string): void {
    // Evaluated via submitEvaluation after AI processing
    // This method exists as the queue callback target
  }

  private findCandidate(candidateId: string): Candidate | undefined {
    return (
      this.state.pendingCandidates.find((c) => c.id === candidateId) ??
      this.state.evaluatedCandidates.find((c) => c.id === candidateId)
    );
  }
}
