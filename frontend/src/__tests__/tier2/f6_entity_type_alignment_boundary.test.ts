import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { Chapter } from '@/types/entities';

const REPO_ROOT = path.resolve(__dirname, '../../../../');

const MIGRATION = 'backend-supabase/supabase/migrations/20260730000004_add_chapter_status.sql';
const ENTITIES = 'frontend/src/types/entities.ts';

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8');
}

function migrationEnumValues(sql: string): string[] {
  const match = sql.match(/CREATE TYPE\s+(?:public\.)?chapter_status AS ENUM \(([^)]+)\)/);
  expect(match).not.toBeNull();
  return match![1].split(',').map((v) => v.trim().replace(/'/g, ''));
}

function tsStatusValues(source: string): string[] {
  const chapterBlock = source.match(/export interface Chapter \{([\s\S]*?)\n\}/);
  expect(chapterBlock).not.toBeNull();
  const statusLine = chapterBlock![1].split('\n').find((l) => l.includes('status:'));
  expect(statusLine).toBeTruthy();
  return Array.from(statusLine!.matchAll(/'([^']+)'/g), (m) => m[1]);
}

describe('F6 entity type alignment boundary (Chapter.status)', () => {
  it('every SQL enum value is assignable to Chapter["status"]', () => {
    const tsValues = tsStatusValues(readRepoFile(ENTITIES));
    const tsSet = new Set<string>(tsValues);
    for (const value of migrationEnumValues(readRepoFile(MIGRATION))) {
      expect(tsSet.has(value)).toBe(true);
    }
  });

  it('every TS union literal appears in the SQL enum', () => {
    const sqlValues = migrationEnumValues(readRepoFile(MIGRATION));
    for (const value of tsStatusValues(readRepoFile(ENTITIES))) {
      expect(sqlValues).toContain(value);
    }
  });

  it('matches exactly in both directions with no extras such as "archived"', () => {
    const sqlValues = migrationEnumValues(readRepoFile(MIGRATION));
    const tsValues = tsStatusValues(readRepoFile(ENTITIES));
    expect([...sqlValues].sort()).toEqual([...tsValues].sort());
    expect(sqlValues).toHaveLength(tsValues.length);
    expect(sqlValues).not.toContain('archived');
    expect(tsValues).not.toContain('archived');
  });

  it('contains no duplicate values in the SQL enum (Set size equals raw count)', () => {
    const sqlValues = migrationEnumValues(readRepoFile(MIGRATION));
    expect(new Set(sqlValues).size).toBe(sqlValues.length);
  });

  it('rejects an out-of-union status at compile time', () => {
    // @ts-expect-error "archived" is not a valid chapter status
    const bad: Chapter['status'] = 'archived';
    expect(typeof bad).toBe('string');
  });

  it('declares the SQL enum values as single-quoted, comma-separated literals', () => {
    const sql = readRepoFile(MIGRATION);
    expect(sql).toMatch(/CREATE TYPE chapter_status AS ENUM \('uploading', 'draft', 'published'\)/);
  });

  it('DDL is idempotent: pg_type guard and ADD COLUMN IF NOT EXISTS make re-runs safe', () => {
    const sql = readRepoFile(MIGRATION);
    expect(sql).toContain('IF NOT EXISTS (SELECT 1 FROM pg_type');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS status chapter_status NOT NULL DEFAULT');
    expect(sql).toMatch(/DEFAULT 'draft'/);
  });
});
