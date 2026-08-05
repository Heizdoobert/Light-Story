import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { Chapter } from '@/types/entities';

const REPO_ROOT = path.resolve(__dirname, '../../../../');

const MIGRATION = 'backend-supabase/supabase/migrations/20260730000004_add_chapter_status.sql';
const ENTITIES = 'frontend/src/types/entities.ts';
const READ_PRESENTER = 'frontend/src/hooks/presenters/useReadChapterPresenter.ts';

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8');
}

function migrationEnumValues(sql: string): string[] {
  const match = sql.match(/CREATE TYPE\s+(?:public\.)?chapter_status AS ENUM \(([^)]+)\)/);
  expect(match).not.toBeNull();
  return match![1].split(',').map((v) => v.trim().replace(/'/g, ''));
}

describe('F6 entity type alignment (Chapter.status)', () => {
  it('migration defines chapter_status enum with uploading/draft/published and defaults to draft', () => {
    const sql = readRepoFile(MIGRATION);
    expect(migrationEnumValues(sql)).toEqual(['uploading', 'draft', 'published']);
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS status chapter_status NOT NULL DEFAULT');
    expect(sql).toMatch(/DEFAULT 'draft'/);
  });

  it('Chapter.status union matches the database enum exactly', () => {
    const statuses: Chapter['status'][] = ['uploading', 'draft', 'published'];
    const sql = readRepoFile(MIGRATION);
    expect(statuses).toEqual(migrationEnumValues(sql));
  });

  it('Chapter interface in entities.ts declares the status field', () => {
    const source = readRepoFile(ENTITIES);
    expect(source).toContain("status: 'uploading' | 'draft' | 'published'");
  });

  it('Chapter literals compile with status: "published"', () => {
    const chapter: Chapter = {
      id: 'chap-1',
      story_id: 'story-1',
      chapter_number: 1,
      title: 't',
      content: '',
      status: 'published',
      created_at: '2026-06-01T10:00:00Z',
    };
    expect(chapter.status).toBe('published');
  });

  it('rejects unknown status values at compile time', () => {
    // @ts-expect-error "deleted" is not a valid chapter status
    const bad: Chapter['status'] = 'deleted';
    expect(typeof bad).toBe('string');
  });

  it('MOCK_CHAPTERS literals in useReadChapterPresenter include status', () => {
    const source = readRepoFile(READ_PRESENTER);
    const matches = source.match(/status: "(uploading|draft|published)"/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
