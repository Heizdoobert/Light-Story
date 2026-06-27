import type { Candidate, Decision, Invite, AgentState, Env } from "./types";

export class SupabaseSync {
  private env: Env;
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingState: AgentState | null = null;

  constructor(env: Env) {
    this.env = env;
    this.baseUrl = env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1";
    this.headers = {
      "Content-Type": "application/json",
      "apikey": env.SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Prefer": "return=minimal",
    };
  }

  /** Debounced sync: coalesces rapid state changes into a single sync call */
  scheduleSync(state: AgentState): void {
    this.pendingState = state;
    if (this.syncTimer) return;
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      if (this.pendingState) {
        const state = this.pendingState;
        this.pendingState = null;
        this.syncAll(state);
      }
    }, 100);
  }

  async syncCandidate(candidate: Candidate): Promise<void> {
    try {
      const body = {
        id: candidate.id,
        source_url: candidate.sourceUrl,
        source_platform: candidate.sourcePlatform,
        creator_name: candidate.creatorName,
        creator_handle: candidate.creatorHandle || null,
        avatar_url: candidate.avatarUrl || null,
        follower_count: candidate.followerCount,
        score: candidate.evaluation?.score ?? null,
        evaluation_json: candidate.evaluation ? JSON.parse(JSON.stringify(candidate.evaluation)) : {},
        verdict: candidate.evaluation?.verdict ?? null,
        status: candidate.status,
        admin_notes: candidate.adminNotes || null,
        created_at: new Date(candidate.createdAt).toISOString(),
        evaluated_at: candidate.evaluatedAt ? new Date(candidate.evaluatedAt).toISOString() : null,
        decided_at: candidate.decidedAt ? new Date(candidate.decidedAt).toISOString() : null,
      };

      const res = await fetch(`${this.baseUrl}/recruitment_candidates?id=eq.${candidate.id}`, {
        method: "PUT",
        headers: { ...this.headers, "Prefer": "resolution=merge-duplicates" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        console.error(`[SupabaseSync] Failed to sync candidate ${candidate.id}: ${res.status}`);
      }
    } catch (err) {
      console.error(`[SupabaseSync] Error syncing candidate ${candidate.id}:`, err);
    }
  }

  async syncDecision(decision: Decision): Promise<void> {
    try {
      const body = {
        id: crypto.randomUUID(),
        candidate_id: decision.candidateId,
        admin_id: decision.adminId,
        action: decision.action,
        notes: decision.notes,
        created_at: new Date(decision.createdAt).toISOString(),
      };

      const res = await fetch(`${this.baseUrl}/recruitment_decisions`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        console.error(`[SupabaseSync] Failed to sync decision for ${decision.candidateId}: ${res.status}`);
      }
    } catch (err) {
      console.error(`[SupabaseSync] Error syncing decision:`, err);
    }
  }

  async syncInvite(invite: Invite): Promise<void> {
    try {
      const body = {
        id: crypto.randomUUID(),
        candidate_id: invite.candidateId,
        invite_code: invite.inviteCode,
        status: invite.status,
        sent_at: new Date(invite.sentAt).toISOString(),
        opened_at: invite.openedAt ? new Date(invite.openedAt).toISOString() : null,
        accepted_at: invite.acceptedAt ? new Date(invite.acceptedAt).toISOString() : null,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const res = await fetch(`${this.baseUrl}/recruitment_invites?id=eq.${invite.candidateId}`, {
        method: "PUT",
        headers: { ...this.headers, "Prefer": "resolution=merge-duplicates" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        console.error(`[SupabaseSync] Failed to sync invite ${invite.inviteCode}: ${res.status}`);
      }
    } catch (err) {
      console.error(`[SupabaseSync] Error syncing invite:`, err);
    }
  }

  async syncAll(state: AgentState): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const candidate of state.pendingCandidates) {
      promises.push(this.syncCandidate(candidate));
    }
    for (const candidate of state.evaluatedCandidates) {
      promises.push(this.syncCandidate(candidate));
    }
    for (const decision of state.decisions) {
      promises.push(this.syncDecision(decision));
    }
    for (const invite of state.invites) {
      promises.push(this.syncInvite(invite));
    }

    await Promise.allSettled(promises);
  }

  async loadCandidates(): Promise<Candidate[]> {
    try {
      const res = await fetch(`${this.baseUrl}/recruitment_candidates?select=*&order=created_at.desc`, {
        headers: this.headers,
      });

      if (!res.ok) {
        console.error(`[SupabaseSync] Failed to load candidates: ${res.status}`);
        return [];
      }

      const rows: any[] = await res.json();
      return rows.map((row) => ({
        id: row.id,
        sourceUrl: row.source_url,
        sourcePlatform: row.source_platform,
        creatorName: row.creator_name || "",
        creatorHandle: row.creator_handle,
        avatarUrl: row.avatar_url,
        followerCount: row.follower_count || 0,
        evaluation: row.evaluation_json ? {
          score: row.evaluation_json.score || 0,
          strengths: row.evaluation_json.strengths || [],
          gaps: row.evaluation_json.gaps || [],
          genreMatch: row.evaluation_json.genreMatch || 0,
          verdict: row.evaluation_json.verdict || "mismatch",
          summary: row.evaluation_json.summary || "",
        } : undefined,
        status: row.status || "pending",
        adminNotes: row.admin_notes,
        createdAt: new Date(row.created_at).getTime(),
        evaluatedAt: row.evaluated_at ? new Date(row.evaluated_at).getTime() : undefined,
        decidedAt: row.decided_at ? new Date(row.decided_at).getTime() : undefined,
      }));
    } catch (err) {
      console.error(`[SupabaseSync] Error loading candidates:`, err);
      return [];
    }
  }
}
