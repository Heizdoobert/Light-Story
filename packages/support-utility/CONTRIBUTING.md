# Contributing to @light-story/support-utility

Thank you for contributing to `@light-story/support-utility`! This package is a pure in-process TypeScript utility and follows the Light-Story monorepo architecture and hygiene guidelines.

## Development Workflow

### 1. Prerequisites & Installation

Always install dependencies from the repository root to maintain single lockfile integrity and prevent duplicate dependencies:

```bash
# Clone and enter monorepo root
cd /path/to/Light-Story

# Install all monorepo dependencies
npm install
```

> **Monorepo Hygiene Rule**: Do not run `npm install` inside `packages/support-utility`. The root `package-lock.json` is the sole source of dependency truth.

### 2. Building

Compile source code from `src/` into `dist/`:

```bash
npm --prefix packages/support-utility run build
```

### 3. Testing

Run the Vitest test suite:

```bash
npm --prefix packages/support-utility test
```

### 4. Linting & Formatting

Ensure zero ESLint errors and warnings before submitting code:

```bash
npm --prefix packages/support-utility run lint
npm --prefix packages/support-utility run format
```

### 5. Type Checking

Verify TypeScript compilation without emit:

```bash
npm --prefix packages/support-utility run typecheck
```

## Architectural Guidelines

1. **Pure In-Process**:
   - Zero external runtime dependencies.
   - Zero network access (`fetch`, `http`, `net`, etc.).
   - Zero filesystem access (`fs`, `path` for file operations).
   - Only ECMAScript built-ins (`Map`, `Date`, `Array`, `Math`, etc.).
2. **Defensive Encapsulation**:
   - The internal `Map<string, Issue>` must remain encapsulated within module closure.
   - All inbound arrays/objects and outbound returned items must be defensively cloned to prevent mutation leaks.
3. **Commit Messages**:
   - Follow Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`.
