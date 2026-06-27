export type Verdict = 'strong_match' | 'potential' | 'mismatch';
export type CandidateStatus = 'pending' | 'evaluated' | 'approved' | 'rejected' | 'invited' | 'onboarded';
export type SourcePlatform = 'pixiv' | 'deviantart' | 'artstation' | 'twitter' | 'behance' | 'webtoon' | 'tapas' | 'mangaplus' | 'manual';

export interface Evaluation {
  score: number; // 0-100
  strengths: string[];
  gaps: string[];
  genreMatch: number; // 0-100
  verdict: Verdict;
  summary: string;
}

export interface Candidate {
  id: string;
  sourceUrl: string;
  sourcePlatform: SourcePlatform;
  creatorName: string;
  creatorHandle?: string;
  avatarUrl?: string;
  followerCount: number;
  evaluation?: Evaluation;
  status: CandidateStatus;
  adminNotes?: string;
  createdAt: number; // epoch ms
  evaluatedAt?: number;
  decidedAt?: number;
}

export interface ScoutSession {
  source: SourcePlatform;
  lastRunAt: number;
  candidatesFound: number;
  status: 'idle' | 'running' | 'error';
  error?: string;
}

export interface Decision {
  candidateId: string;
  action: 'approve' | 'reject' | 'invite';
  notes: string;
  adminId: string;
  createdAt: number;
}

export interface Invite {
  candidateId: string;
  inviteCode: string;
  status: 'sent' | 'opened' | 'accepted' | 'expired';
  sentAt: number;
  openedAt?: number;
  acceptedAt?: number;
}

export interface AgentState {
  adminId: string;
  scoutSessions: ScoutSession[];
  pendingCandidates: Candidate[];
  evaluatedCandidates: Candidate[];
  decisions: Decision[];
  invites: Invite[];
  lastCronRun: number;
}

export interface Ai {
  run: (model: string, options: { messages: any[] }) => Promise<any>;
}

export interface Env {
  RecruitmentAgent: DurableObjectNamespace;
  AI: Ai;
  SEND_EMAIL_BINDING: SendEmail;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  WORKERS_AI_MODEL: string;
  PIXIV_ACCESS_TOKEN: string;
  DEVIANTART_ACCESS_TOKEN: string;
  TWITTER_BEARER_TOKEN: string;
  BEHANCE_CLIENT_ID: string;
}
