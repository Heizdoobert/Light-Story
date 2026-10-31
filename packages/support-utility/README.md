# @light-story/support-utility

A lightweight, pure in-process TypeScript utility for recording, diagnosing, and resolving issues across IT, QA, and development teams.

## Features

- **Pure In-Process Execution**: Zero runtime dependencies, zero external network requests, zero filesystem I/O.
- **Defensive Encapsulation**: Private in-memory store using JavaScript `Map<string, Issue>` within module closure. Callers receive defensively cloned objects to prevent external state tampering.
- **Clean Public API**:
  - `addIssue(input: IssueInput): Issue`
  - `getIssue(id: string): Issue | undefined`
  - `listIssues(filter?: IssueFilter): Issue[]`
  - `resolveIssue(id: string): boolean`
  - `checkIssue(id: string): IssueSummary | undefined`
  - `_resetStore(): void` *(test-only)*
- **Type Safety**: Fully typed with TypeScript declarations, exporting `Issue`, `IssueInput`, `IssueFilter`, `IssueSummary`, `IssueStatus`, and `IssueStore` (`ReadonlyMap<string, Issue>`).
- **Comprehensive Verification**: 4-tier test architecture tested with Vitest.

## Installation

As part of the Light-Story monorepo, install dependencies exclusively from the monorepo root:

```bash
# From the monorepo root
npm install
```

> **Important**: Never run `npm install` directly inside `packages/support-utility`. All workspace dependencies are managed at the monorepo root.

## Build

Compile TypeScript source (`src/`) to production ESM output (`dist/`):

```bash
# From monorepo root
npm --prefix packages/support-utility run build

# Or using npm workspace flag
npm run build -w @light-story/support-utility
```

## Type Check

Verify static types without emitting files:

```bash
npm --prefix packages/support-utility run typecheck
```

## Lint & Format

Run static code analysis and formatting checks:

```bash
# Lint with ESLint
npm --prefix packages/support-utility run lint

# Format with Prettier
npm --prefix packages/support-utility run format
```

## Test

Execute the comprehensive 4-tier Vitest test suite:

```bash
# From monorepo root
npm --prefix packages/support-utility test

# Or using npm workspace flag
npm test -w @light-story/support-utility
```

## Usage Example

```typescript
import {
  addIssue,
  getIssue,
  listIssues,
  resolveIssue,
  checkIssue,
  type Issue,
  type IssueStore,
} from '@light-story/support-utility';

// 1. Add a new issue
const issue = addIssue({
  id: 'IT-101',
  title: 'Database connection pool timeout',
  description: 'Connection pool exhausted under high peak load',
  tags: ['database', 'infra', 'p0'],
});
console.log('Created issue:', issue);

// 2. Query issue details
const details = getIssue('IT-101');
console.log('Status:', details?.status); // 'open'

// 3. Inspect diagnostic summary
const summary = checkIssue('IT-101');
console.log(`Issue ${summary?.id} age: ${summary?.ageHours} hours`);

// 4. Query issues by filter
const infraIssues = listIssues({ status: 'open', tags: ['infra'] });
console.log(`Open infra issues: ${infraIssues.length}`);

// 5. Resolve the issue
const resolved = resolveIssue('IT-101');
console.log('Resolved successfully:', resolved); // true

// 6. Confirm resolved status
console.log('Updated status:', getIssue('IT-101')?.status); // 'resolved'
```

## CI / CD

Continuous Integration is automated via GitHub Actions in `.github/workflows/support-utility-ci.yml`. On every PR and push to `main` touching `packages/support-utility/**`, CI builds, lints, and executes the complete test suite.
