/**
 * Light‑Story Support Utility
 *
 * A tiny in‑process module that helps the IT team, QA engineers, and developers
 * to record, query, and resolve issues without any external I/O.
 *
 * The utility keeps an in‑memory store of issues. Each issue has an id, title,
 * description, optional tags, and a status (`open` | `resolved`).
 *
 * Exported API:
 *   - `addIssue(issue: IssueInput): Issue`
 *   - `getIssue(id: string): Issue | undefined`
 *   - `listIssues(filter?: IssueFilter): Issue[]`
 *   - `resolveIssue(id: string): boolean`
 *   - `checkIssue(id: string): IssueSummary | undefined`
 *   - `_resetStore(): void` (test‑only)
 */

export type IssueStatus = 'open' | 'resolved';

export interface IssueInput {
  id: string; // unique identifier (e.g., JIRA ticket id)
  title: string;
  description: string;
  tags?: string[];
}

export interface Issue extends IssueInput {
  status: IssueStatus;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface IssueSummary {
  id: string;
  title: string;
  status: IssueStatus;
  ageHours: number; // hours since creation
  tags?: string[];
}

export interface IssueFilter {
  status?: IssueStatus;
  tags?: string[];
}

/** In‑memory store – lives for the lifetime of the process */
const store = new Map<string, Issue>();

/**
 * Defensive copy helper to ensure callers cannot mutate internal store state
 * and internal store cannot be mutated via external object references.
 */
function cloneIssue(issue: Issue): Issue {
  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    tags: issue.tags ? [...issue.tags] : undefined,
    status: issue.status,
    createdAt: new Date(issue.createdAt.getTime()),
    resolvedAt: issue.resolvedAt ? new Date(issue.resolvedAt.getTime()) : undefined,
  };
}

/** Add a new issue. Throws if the id already exists. */
export function addIssue(input: IssueInput): Issue {
  if (store.has(input.id)) {
    throw new Error(`Issue with id ${input.id} already exists`);
  }
  const now = new Date();
  const issue: Issue = {
    id: input.id,
    title: input.title,
    description: input.description,
    tags: input.tags ? [...input.tags] : undefined,
    status: 'open',
    createdAt: now,
  };
  store.set(issue.id, issue);
  return cloneIssue(issue);
}

/** Retrieve an issue by id. */
export function getIssue(id: string): Issue | undefined {
  const issue = store.get(id);
  return issue ? cloneIssue(issue) : undefined;
}

/** List issues, optionally filtered. */
export function listIssues(filter?: IssueFilter): Issue[] {
  let result = Array.from(store.values());
  if (filter?.status) {
    result = result.filter(i => i.status === filter.status);
  }
  if (filter?.tags && filter.tags.length > 0) {
    result = result.filter(i => i.tags && filter.tags!.some(t => i.tags!.includes(t)));
  }
  return result.map(cloneIssue);
}

/** Mark an issue as resolved. Returns true if the issue existed and was resolved. */
export function resolveIssue(id: string): boolean {
  const issue = store.get(id);
  if (!issue || issue.status === 'resolved') return false;
  store.set(id, {
    ...issue,
    tags: issue.tags ? [...issue.tags] : undefined,
    status: 'resolved',
    createdAt: new Date(issue.createdAt.getTime()),
    resolvedAt: new Date(),
  });
  return true;
}

/** Helper that returns a lightweight summary suitable for quick checks. */
export function checkIssue(id: string): IssueSummary | undefined {
  const issue = store.get(id);
  if (!issue) return undefined;
  const now = new Date();
  const ageMs = now.getTime() - issue.createdAt.getTime();
  const ageHours = Math.round(ageMs / (1000 * 60 * 60));
  return {
    id: issue.id,
    title: issue.title,
    status: issue.status,
    ageHours,
    tags: issue.tags ? [...issue.tags] : undefined,
  };
}

/** Reset the store – useful for testing. */
export function _resetStore(): void {
  store.clear();
}

// Optional convenience export for consumers who need a read‑only view of the store
export type IssueStore = ReadonlyMap<string, Issue>;
