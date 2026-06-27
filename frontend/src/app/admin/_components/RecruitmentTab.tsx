"use client";

import React, { useState } from "react";
import { useAuth } from "@/modules/auth/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  PlusCircle,
  Search,
  Send,
  Star,
  UserCheck,
  UserPlus,
  UserSearch,
  XCircle,
} from "lucide-react";

type SourcePlatform =
  | "pixiv"
  | "deviantart"
  | "artstation"
  | "twitter"
  | "behance"
  | "webtoon"
  | "tapas"
  | "mangaplus"
  | "manual";

type CandidateStatus =
  | "pending"
  | "evaluated"
  | "approved"
  | "rejected"
  | "invited"
  | "onboarded";

type Verdict = "strong_match" | "potential" | "mismatch";

interface Evaluation {
  score: number;
  strengths: string[];
  gaps: string[];
  genreMatch: number;
  verdict: Verdict;
  summary: string;
}

interface Candidate {
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
  createdAt: number;
  evaluatedAt?: number;
  decidedAt?: number;
}

interface Invite {
  candidateId: string;
  inviteCode: string;
  status: "sent" | "opened" | "accepted" | "expired";
  sentAt: number;
}

interface DashboardData {
  candidates: Candidate[];
  invites: Invite[];
}

const API_BASE = "/api/recruitment";

const PLATFORMS: SourcePlatform[] = [
  "pixiv",
  "deviantart",
  "artstation",
  "twitter",
  "behance",
  "webtoon",
  "tapas",
  "mangaplus",
];

const VERDICT_STYLES: Record<Verdict, string> = {
  strong_match: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  potential: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  mismatch: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const INVITE_STATUS_STYLES: Record<string, string> = {
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  opened: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  expired: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function fetchDashboard(adminId: string): Promise<DashboardData> {
  return fetch(`${API_BASE}/admin/${adminId}/dashboard`).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch recruitment data");
    return r.json();
  });
}

function StatCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/80 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 truncate">
            {title}
          </p>
          <div className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            {value}
          </div>
        </div>
        <div
          className={`h-10 w-10 rounded-2xl ${accent} shadow-lg flex-shrink-0 flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionShell({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.10)] overflow-hidden">
      <header className="flex items-start gap-4 border-b border-slate-100 dark:border-slate-800 px-6 py-5">
        <div className="rounded-2xl p-3 bg-slate-950 text-white dark:bg-slate-900">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
            {title}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="animate-spin text-slate-400" size={32} />
    </div>
  );
}

function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      <AlertCircle className="text-red-400" size={32} />
      <p className="text-red-600 dark:text-red-400 font-medium">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function RecruitmentTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const adminId = user?.id || "unknown";

  const [manualUrl, setManualUrl] = useState("");
  const [manualPlatform, setManualPlatform] = useState<SourcePlatform>("manual");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["recruitment", adminId],
    queryFn: () => fetchDashboard(adminId),
    enabled: !!adminId,
  });

  const candidates = dashboard?.candidates ?? [];
  const invites = dashboard?.invites ?? [];

  const pending = candidates.filter(
    (c) => c.status === "pending" || c.status === "evaluated"
  );
  const evaluated = candidates.filter((c) => c.status !== "pending");
  const approved = candidates.filter((c) => c.status === "approved");
  const invited = candidates.filter((c) => c.status === "invited");

  const addCandidateMutation = useMutation({
    mutationFn: (body: { url: string; platform: SourcePlatform }) =>
      fetch(`${API_BASE}/admin/${adminId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to add candidate");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment", adminId] });
      toast.success("Candidate added");
      setManualUrl("");
    },
    onError: () => toast.error("Failed to add candidate"),
  });

  const scoutMutation = useMutation({
    mutationFn: (body: { platform: SourcePlatform; query: string }) =>
      fetch(`${API_BASE}/admin/${adminId}/scout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to trigger scout");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment", adminId] });
      toast.success("Scout triggered");
    },
    onError: () => toast.error("Failed to trigger scout"),
  });

  const evaluateMutation = useMutation({
    mutationFn: (candidateId: string) =>
      fetch(`${API_BASE}/admin/${adminId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to queue evaluation");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment", adminId] });
      toast.success("Evaluation queued");
    },
    onError: () => toast.error("Failed to queue evaluation"),
  });

  const approveMutation = useMutation({
    mutationFn: (body: { candidateId: string; notes?: string }) =>
      fetch(`${API_BASE}/admin/${adminId}/candidates/${body.candidateId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes: body.notes }),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to approve");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment", adminId] });
      toast.success("Candidate approved");
    },
    onError: () => toast.error("Failed to approve candidate"),
  });

  const rejectMutation = useMutation({
    mutationFn: (candidateId: string) =>
      fetch(`${API_BASE}/admin/${adminId}/candidates/${candidateId}/reject`, {
        method: "POST",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to reject");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment", adminId] });
      toast.success("Candidate rejected");
    },
    onError: () => toast.error("Failed to reject candidate"),
  });

  const inviteMutation = useMutation({
    mutationFn: (candidateId: string) =>
      fetch(`${API_BASE}/admin/${adminId}/candidates/${candidateId}/invite`, {
        method: "POST",
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to send invite");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment", adminId] });
      toast.success("Invite sent");
    },
    onError: () => toast.error("Failed to send invite"),
  });

  if (isLoading) return <div className="p-6"><Spinner /></div>;
  if (error) {
    return (
      <div className="p-6">
        <ErrorBlock
          message="Failed to load recruitment data"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white flex items-center gap-3">
          <UserSearch className="text-blue-500" size={28} />
          Recruitment
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          Discover, evaluate, and invite creators to the platform.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Candidates"
          value={candidates.length}
          icon={<UserPlus className="text-white" size={20} />}
          accent="bg-gradient-to-br from-blue-500 to-cyan-400"
        />
        <StatCard
          title="Evaluated"
          value={evaluated.length}
          icon={<Activity className="text-white" size={20} />}
          accent="bg-gradient-to-br from-violet-500 to-fuchsia-400"
        />
        <StatCard
          title="Approved"
          value={approved.length}
          icon={<CheckCircle className="text-white" size={20} />}
          accent="bg-gradient-to-br from-emerald-500 to-lime-400"
        />
        <StatCard
          title="Invited"
          value={invited.length}
          icon={<Send className="text-white" size={20} />}
          accent="bg-gradient-to-br from-amber-500 to-orange-400"
        />
      </div>

      {/* Manual URL Input */}
      <SectionShell
        title="Add Candidate Manually"
        description="Submit a creator profile URL for evaluation."
        icon={<PlusCircle size={20} />}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!manualUrl.trim()) return;
            addCandidateMutation.mutate({
              url: manualUrl.trim(),
              platform: manualPlatform,
            });
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Profile URL
            </label>
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Platform
            </label>
            <select
              value={manualPlatform}
              onChange={(e) =>
                setManualPlatform(e.target.value as SourcePlatform)
              }
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
              <option value="manual">Manual</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={addCandidateMutation.isPending || !manualUrl.trim()}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {addCandidateMutation.isPending ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <PlusCircle size={16} />
            )}
            Add Candidate
          </button>
        </form>
      </SectionShell>

      {/* Scout Trigger */}
      <SectionShell
        title="Scout Creators"
        description="Search platforms for creators matching keywords."
        icon={<Search size={20} />}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Search Query
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. fantasy comic artist, manga style"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PLATFORMS.map((platform) => (
              <button
                key={platform}
                onClick={() => {
                  if (!searchQuery.trim()) {
                    toast.error("Enter a search query first");
                    return;
                  }
                  scoutMutation.mutate({
                    platform,
                    query: searchQuery.trim(),
                  });
                }}
                disabled={scoutMutation.isPending}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Search size={14} />
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </SectionShell>

      {/* Pending Candidates */}
      <SectionShell
        title="Pending Candidates"
        description="Candidates awaiting evaluation."
        icon={<Clock size={20} />}
      >
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No pending candidates.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="pb-3 pr-4">Creator</th>
                  <th className="pb-3 pr-4">Platform</th>
                  <th className="pb-3 pr-4">Source</th>
                  <th className="pb-3 pr-4">Added</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                      {c.creatorName || "—"}
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400 capitalize">
                      {c.sourcePlatform}
                    </td>
                    <td className="py-3 pr-4">
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
                      >
                        Link
                        <ExternalLink size={12} />
                      </a>
                    </td>
                    <td className="py-3 pr-4 text-slate-500 dark:text-slate-400 text-xs">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => evaluateMutation.mutate(c.id)}
                        disabled={evaluateMutation.isPending}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        Evaluate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionShell>

      {/* Evaluated Candidates */}
      <SectionShell
        title="Evaluated Candidates"
        description="Review evaluations and take action."
        icon={<Star size={20} />}
      >
        {evaluated.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No evaluated candidates yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="pb-3 pr-4">Creator</th>
                  <th className="pb-3 pr-4">Score</th>
                  <th className="pb-3 pr-4">Verdict</th>
                  <th className="pb-3 pr-4">Genre Match</th>
                  <th className="pb-3 pr-4">Strengths</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {evaluated.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                      {c.creatorName || "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                        {c.evaluation?.score ?? "—"}
                        {c.evaluation?.score != null && (
                          <span className="text-xs text-slate-400">/100</span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {c.evaluation?.verdict ? (
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${VERDICT_STYLES[c.evaluation.verdict]}`}
                        >
                          {c.evaluation.verdict.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                      {c.evaluation?.genreMatch != null
                        ? `${c.evaluation.genreMatch}%`
                        : "—"}
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                      {c.evaluation?.strengths?.length
                        ? c.evaluation.strengths.join(", ")
                        : "—"}
                    </td>
                    <td className="py-3 flex items-center gap-1">
                      {c.status === "evaluated" && (
                        <>
                          <button
                            onClick={() =>
                              approveMutation.mutate({
                                candidateId: c.id,
                              })
                            }
                            disabled={approveMutation.isPending}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1"
                          >
                            <CheckCircle size={12} />
                            Approve
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(c.id)}
                            disabled={rejectMutation.isPending}
                            className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1"
                          >
                            <XCircle size={12} />
                            Reject
                          </button>
                        </>
                      )}
                      {c.status === "approved" && (
                        <button
                          onClick={() => inviteMutation.mutate(c.id)}
                          disabled={inviteMutation.isPending}
                          className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1"
                        >
                          <Send size={12} />
                          Invite
                        </button>
                      )}
                      {(c.status === "invited" || c.status === "onboarded") && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                          <UserCheck size={12} />
                          {c.status === "invited" ? "Invited" : "Onboarded"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionShell>

      {/* Recent Invites */}
      <SectionShell
        title="Recent Invites"
        description="Track invite status and redemption."
        icon={<Send size={20} />}
      >
        {invites.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No invites sent yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="pb-3 pr-4">Invite Code</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Sent</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr
                    key={inv.inviteCode}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-3 pr-4 font-mono text-sm text-slate-900 dark:text-white">
                      {inv.inviteCode}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                          INVITE_STATUS_STYLES[inv.status] ?? ""
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(inv.sentAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionShell>
    </div>
  );
}
