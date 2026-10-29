import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addIssue,
  getIssue,
  listIssues,
  resolveIssue,
  checkIssue,
  _resetStore,
  IssueInput,
} from '../src/index';

beforeEach(() => {
  _resetStore();
});

describe('Tier 1: Feature Coverage (Core API in Isolation)', () => {
  describe('addIssue', () => {
    it('creates an issue with open status, createdAt timestamp, and all provided fields', () => {
      const input: IssueInput = {
        id: 'T1-001',
        title: 'Login failure',
        description: 'Users cannot log in via SSO',
        tags: ['auth', 'critical'],
      };
      const created = addIssue(input);
      expect(created.id).toBe('T1-001');
      expect(created.title).toBe('Login failure');
      expect(created.description).toBe('Users cannot log in via SSO');
      expect(created.tags).toEqual(['auth', 'critical']);
      expect(created.status).toBe('open');
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.resolvedAt).toBeUndefined();
    });

    it('creates an issue without optional tags', () => {
      const input: IssueInput = {
        id: 'T1-002',
        title: 'Minor typo in footer',
        description: 'Copyright year should be 2026',
      };
      const created = addIssue(input);
      expect(created.id).toBe('T1-002');
      expect(created.tags).toBeUndefined();
      expect(created.status).toBe('open');
      expect(created.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getIssue', () => {
    it('retrieves an existing issue by id', () => {
      const input: IssueInput = {
        id: 'T1-003',
        title: 'Database connection spike',
        description: 'Connection pool exhausted under load',
        tags: ['db'],
      };
      const created = addIssue(input);
      const retrieved = getIssue('T1-003');
      expect(retrieved).toEqual(created);
    });
  });

  describe('listIssues', () => {
    it('returns all issues when called without filter', () => {
      addIssue({ id: 'T1-004', title: 'Issue 4', description: 'Desc 4' });
      addIssue({ id: 'T1-005', title: 'Issue 5', description: 'Desc 5' });
      const list = listIssues();
      expect(list).toHaveLength(2);
      expect(list.map(i => i.id)).toEqual(['T1-004', 'T1-005']);
    });

    it('filters issues by single status', () => {
      addIssue({ id: 'T1-006', title: 'Issue 6', description: 'Desc 6' });
      addIssue({ id: 'T1-007', title: 'Issue 7', description: 'Desc 7' });
      resolveIssue('T1-006');
      const openList = listIssues({ status: 'open' });
      const resolvedList = listIssues({ status: 'resolved' });
      expect(openList).toHaveLength(1);
      expect(openList[0].id).toBe('T1-007');
      expect(resolvedList).toHaveLength(1);
      expect(resolvedList[0].id).toBe('T1-006');
    });

    it('filters issues by single tag', () => {
      addIssue({ id: 'T1-008', title: 'Issue 8', description: 'Desc 8', tags: ['frontend'] });
      addIssue({ id: 'T1-009', title: 'Issue 9', description: 'Desc 9', tags: ['backend'] });
      const frontendList = listIssues({ tags: ['frontend'] });
      expect(frontendList).toHaveLength(1);
      expect(frontendList[0].id).toBe('T1-008');
    });
  });

  describe('resolveIssue', () => {
    it('resolves an open issue, sets status to resolved, and records resolvedAt timestamp', () => {
      addIssue({ id: 'T1-010', title: 'Issue 10', description: 'Desc 10' });
      const resolved = resolveIssue('T1-010');
      expect(resolved).toBe(true);
      const issue = getIssue('T1-010');
      expect(issue?.status).toBe('resolved');
      expect(issue?.resolvedAt).toBeInstanceOf(Date);
      expect(issue?.resolvedAt!.getTime()).toBeGreaterThanOrEqual(issue!.createdAt.getTime());
    });
  });

  describe('checkIssue', () => {
    it('returns an IssueSummary with id, title, status, ageHours, and tags for an open issue', () => {
      addIssue({
        id: 'T1-011',
        title: 'Issue 11',
        description: 'Desc 11',
        tags: ['ui', 'bug'],
      });
      const summary = checkIssue('T1-011');
      expect(summary).toBeDefined();
      expect(summary?.id).toBe('T1-011');
      expect(summary?.title).toBe('Issue 11');
      expect(summary?.status).toBe('open');
      expect(summary?.tags).toEqual(['ui', 'bug']);
      expect(typeof summary?.ageHours).toBe('number');
      expect(summary?.ageHours).toBe(0);
    });
  });

  describe('_resetStore', () => {
    it('clears all issues from store', () => {
      addIssue({ id: 'T1-012', title: 'Issue 12', description: 'Desc 12' });
      expect(listIssues()).toHaveLength(1);
      _resetStore();
      expect(listIssues()).toHaveLength(0);
      expect(getIssue('T1-012')).toBeUndefined();
    });
  });
});

describe('Tier 2: Boundary & Corner Cases', () => {
  describe('addIssue boundaries', () => {
    it('throws an error when adding an issue with an existing duplicate id without corrupting the store', () => {
      const input: IssueInput = { id: 'T2-DUP', title: 'Original', description: 'Original desc' };
      addIssue(input);
      expect(() => addIssue({ id: 'T2-DUP', title: 'Duplicate', description: 'Duplicate desc' }))
        .toThrowError(/Issue with id T2-DUP already exists/);
      const preserved = getIssue('T2-DUP');
      expect(preserved?.title).toBe('Original');
    });

    it('accepts issues with minimal valid fields including empty string title and description', () => {
      const issue = addIssue({ id: 'T2-EMPTY-STRINGS', title: '', description: '' });
      expect(issue.id).toBe('T2-EMPTY-STRINGS');
      expect(issue.title).toBe('');
      expect(issue.description).toBe('');
      expect(getIssue('T2-EMPTY-STRINGS')?.title).toBe('');
    });

    it('accepts issues with an empty tags array', () => {
      const issue = addIssue({ id: 'T2-EMPTY-TAGS', title: 'Empty tags', description: 'Desc', tags: [] });
      expect(issue.tags).toEqual([]);
      expect(getIssue('T2-EMPTY-TAGS')?.tags).toEqual([]);
    });
  });

  describe('getIssue boundaries', () => {
    it('returns undefined for non-existent issue ids', () => {
      expect(getIssue('DOES-NOT-EXIST')).toBeUndefined();
    });
  });

  describe('resolveIssue boundaries & idempotency', () => {
    it('returns false when attempting to resolve a non-existent issue id', () => {
      const resolved = resolveIssue('NON-EXISTENT');
      expect(resolved).toBe(false);
    });

    it('returns false when attempting to re-resolve an already resolved issue and preserves original resolvedAt', () => {
      addIssue({ id: 'T2-RESOLVED', title: 'Title', description: 'Desc' });
      const firstResolve = resolveIssue('T2-RESOLVED');
      expect(firstResolve).toBe(true);
      const originalResolvedAt = getIssue('T2-RESOLVED')?.resolvedAt;

      const secondResolve = resolveIssue('T2-RESOLVED');
      expect(secondResolve).toBe(false);
      expect(getIssue('T2-RESOLVED')?.resolvedAt).toEqual(originalResolvedAt);
    });
  });

  describe('checkIssue boundaries', () => {
    it('returns undefined for non-existent issue ids', () => {
      expect(checkIssue('NON-EXISTENT')).toBeUndefined();
    });

    it('handles issues without tags gracefully in summary', () => {
      addIssue({ id: 'T2-NO-TAGS', title: 'No tags', description: 'Desc' });
      const summary = checkIssue('T2-NO-TAGS');
      expect(summary).toBeDefined();
      expect(summary?.tags).toBeUndefined();
    });

    it('returns correct summary for resolved issues', () => {
      addIssue({ id: 'T2-RES-SUM', title: 'Resolved summary', description: 'Desc' });
      resolveIssue('T2-RES-SUM');
      const summary = checkIssue('T2-RES-SUM');
      expect(summary?.status).toBe('resolved');
    });
  });

  describe('Store reset isolation', () => {
    it('can be called multiple consecutive times without throwing', () => {
      expect(() => {
        _resetStore();
        _resetStore();
      }).not.toThrow();
      expect(listIssues()).toEqual([]);
    });
  });

  describe('Defensive encapsulation & store immutability', () => {
    it('does not mutate stored issue when caller mutates the input tags array after addition', () => {
      const tags = ['initial', 'secure'];
      const input: IssueInput = { id: 'T2-MUT-INPUT', title: 'Test', description: 'Test', tags };
      addIssue(input);
      tags.push('injected');
      const stored = getIssue('T2-MUT-INPUT');
      expect(stored?.tags).toEqual(['initial', 'secure']);
      expect(stored?.tags).not.toContain('injected');
    });

    it('does not mutate stored issue when caller mutates the tags array of the object returned by getIssue', () => {
      addIssue({ id: 'T2-MUT-GET', title: 'Test', description: 'Test', tags: ['v1'] });
      const fetched = getIssue('T2-MUT-GET');
      expect(fetched).toBeDefined();
      fetched!.tags?.push('leaked');
      const refetched = getIssue('T2-MUT-GET');
      expect(refetched?.tags).toEqual(['v1']);
    });

    it('does not mutate stored issue when caller mutates issues returned by listIssues', () => {
      addIssue({ id: 'T2-MUT-LIST', title: 'Original title', description: 'Desc', tags: ['list-tag'] });
      const issues = listIssues();
      issues[0].title = 'Hacked title';
      issues[0].tags?.push('hacked-tag');
      const refetched = getIssue('T2-MUT-LIST');
      expect(refetched?.title).toBe('Original title');
      expect(refetched?.tags).toEqual(['list-tag']);
    });
  });
});

describe('Tier 3: Cross-Feature Combinations & Filter Semantics', () => {
  it('filters by status AND tag simultaneously (AND semantics)', () => {
    addIssue({ id: 'T3-1', title: 'Issue 1', description: 'D1', tags: ['frontend', 'p1'] });
    addIssue({ id: 'T3-2', title: 'Issue 2', description: 'D2', tags: ['frontend', 'p2'] });
    addIssue({ id: 'T3-3', title: 'Issue 3', description: 'D3', tags: ['backend', 'p1'] });
    addIssue({ id: 'T3-4', title: 'Issue 4', description: 'D4', tags: ['frontend', 'p1'] });
    resolveIssue('T3-4');

    const openFrontend = listIssues({ status: 'open', tags: ['frontend'] });
    expect(openFrontend.map(i => i.id).sort()).toEqual(['T3-1', 'T3-2']);

    const openP1 = listIssues({ status: 'open', tags: ['p1'] });
    expect(openP1.map(i => i.id).sort()).toEqual(['T3-1', 'T3-3']);

    const resolvedFrontend = listIssues({ status: 'resolved', tags: ['frontend'] });
    expect(resolvedFrontend.map(i => i.id)).toEqual(['T3-4']);
  });

  it('filters by multiple tags using OR semantics (matching any of the specified tags)', () => {
    addIssue({ id: 'T3-OR-1', title: 'UI bug', description: 'D', tags: ['frontend'] });
    addIssue({ id: 'T3-OR-2', title: 'API bug', description: 'D', tags: ['backend'] });
    addIssue({ id: 'T3-OR-3', title: 'DB lock', description: 'D', tags: ['database'] });

    const matched = listIssues({ tags: ['frontend', 'backend'] });
    expect(matched.map(i => i.id).sort()).toEqual(['T3-OR-1', 'T3-OR-2']);
  });

  it('returns all issues when filter is an empty object {}', () => {
    addIssue({ id: 'T3-EMPTY-1', title: 'Issue 1', description: 'D' });
    addIssue({ id: 'T3-EMPTY-2', title: 'Issue 2', description: 'D' });
    const all = listIssues({});
    expect(all).toHaveLength(2);
  });

  it('returns all issues when filter tags array is empty { tags: [] }', () => {
    addIssue({ id: 'T3-EMPTY-TAGS-1', title: 'Issue 1', description: 'D', tags: ['a'] });
    addIssue({ id: 'T3-EMPTY-TAGS-2', title: 'Issue 2', description: 'D' });
    const all = listIssues({ tags: [] });
    expect(all).toHaveLength(2);
  });

  it('safely filters tags when store contains issues with undefined tags without throwing', () => {
    addIssue({ id: 'T3-NO-TAG', title: 'Issue without tags', description: 'D' });
    addIssue({ id: 'T3-WITH-TAG', title: 'Issue with tag', description: 'D', tags: ['target'] });
    const result = listIssues({ tags: ['target'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('T3-WITH-TAG');
  });

  it('returns an empty array when filter matches no issues', () => {
    addIssue({ id: 'T3-NOMATCH', title: 'Issue', description: 'D', tags: ['dev'] });
    const noMatches = listIssues({ tags: ['non-existent'] });
    expect(noMatches).toEqual([]);
    const noResolved = listIssues({ status: 'resolved' });
    expect(noResolved).toEqual([]);
  });

  it('accurately reflects status transitions in filtered queries after resolution', () => {
    addIssue({ id: 'T3-CYCLE', title: 'Lifecycle check', description: 'D' });
    expect(listIssues({ status: 'open' })).toHaveLength(1);
    expect(listIssues({ status: 'resolved' })).toHaveLength(0);

    resolveIssue('T3-CYCLE');

    expect(listIssues({ status: 'open' })).toHaveLength(0);
    expect(listIssues({ status: 'resolved' })).toHaveLength(1);
  });
});

describe('Tier 4: Real-World Diagnostic Scenarios', () => {
  it('simulates end-to-end incident lifecycle: triage, aging, resolution, and verification', () => {
    // Step 1: IT/QA reports critical incident
    const ticket = addIssue({
      id: 'INC-2026-001',
      title: 'Payment webhook returning 500',
      description: 'Stripe webhook fails signature validation',
      tags: ['billing', 'urgent', 'production'],
    });
    expect(ticket.status).toBe('open');

    // Step 2: On-call engineer queries triage queue
    const urgentQueue = listIssues({ status: 'open', tags: ['urgent'] });
    expect(urgentQueue).toHaveLength(1);
    expect(urgentQueue[0].id).toBe('INC-2026-001');

    // Step 3: Diagnostic check confirms initial status
    const initialCheck = checkIssue('INC-2026-001');
    expect(initialCheck?.status).toBe('open');
    expect(initialCheck?.ageHours).toBe(0);

    // Step 4: Resolution applied
    const resolved = resolveIssue('INC-2026-001');
    expect(resolved).toBe(true);

    // Step 5: Post-resolution verification
    const finalCheck = checkIssue('INC-2026-001');
    expect(finalCheck?.status).toBe('resolved');

    // Step 6: Queue is cleared
    const remainingOpen = listIssues({ status: 'open', tags: ['urgent'] });
    expect(remainingOpen).toHaveLength(0);
  });

  it('accurately calculates ageHours over elapsed time using fake timers', () => {
    vi.useFakeTimers();
    try {
      const baseDate = new Date('2026-10-26T10:00:00.000Z');
      vi.setSystemTime(baseDate);

      addIssue({
        id: 'AGE-001',
        title: 'Long standing bug',
        description: 'Tracking ticket aging over time',
      });

      // Check at T+0h
      expect(checkIssue('AGE-001')?.ageHours).toBe(0);

      // Advance 30 mins (0.5 hr) -> Math.round rounds to 1
      vi.setSystemTime(new Date(baseDate.getTime() + 30 * 60 * 1000));
      expect(checkIssue('AGE-001')?.ageHours).toBe(1);

      // Advance to 5 hours
      vi.setSystemTime(new Date(baseDate.getTime() + 5 * 3600 * 1000));
      expect(checkIssue('AGE-001')?.ageHours).toBe(5);

      // Advance to 48 hours (2 days)
      vi.setSystemTime(new Date(baseDate.getTime() + 48 * 3600 * 1000));
      expect(checkIssue('AGE-001')?.ageHours).toBe(48);
    } finally {
      vi.useRealTimers();
    }
  });

  it('handles multi-issue IT/QA batch triage across multiple departments', () => {
    const departments = ['network', 'database', 'frontend', 'security'];
    for (let d = 0; d < departments.length; d++) {
      for (let i = 1; i <= 5; i++) {
        addIssue({
          id: `BATCH-${departments[d].toUpperCase()}-${i}`,
          title: `${departments[d]} issue #${i}`,
          description: `Automated test issue for ${departments[d]}`,
          tags: [departments[d], i <= 2 ? 'p1' : 'p2'],
        });
      }
    }

    // Total 20 issues created
    expect(listIssues()).toHaveLength(20);

    // Bulk resolve all network issues
    for (let i = 1; i <= 5; i++) {
      resolveIssue(`BATCH-NETWORK-${i}`);
    }

    // Verify counts
    expect(listIssues({ status: 'resolved' })).toHaveLength(5);
    expect(listIssues({ status: 'open' })).toHaveLength(15);

    // Query specific open backlog: database p1 issues
    const dbP1 = listIssues({ status: 'open', tags: ['p1'] }).filter(issue =>
      issue.tags?.includes('database')
    );
    expect(dbP1).toHaveLength(2);
  });
});
