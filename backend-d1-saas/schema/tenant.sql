CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed')),
  view_count INTEGER NOT NULL DEFAULT 0,
  author TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stories_slug ON stories (slug);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories (status);
CREATE INDEX IF NOT EXISTS idx_stories_updated_at ON stories (updated_at DESC);

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories (id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL CHECK (chapter_number > 0),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (story_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_chapters_story_id ON chapters (story_id);
CREATE INDEX IF NOT EXISTS idx_chapters_story_number ON chapters (story_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_chapters_updated_at ON chapters (updated_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_chapters_sync_story_views_after_insert
AFTER INSERT ON chapters
BEGIN
  UPDATE stories
  SET view_count = (
    SELECT COALESCE(SUM(view_count), 0)
    FROM chapters
    WHERE story_id = NEW.story_id
  ),
  updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.story_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_chapters_sync_story_views_after_update
AFTER UPDATE OF view_count, story_id ON chapters
BEGIN
  UPDATE stories
  SET view_count = (
    SELECT COALESCE(SUM(view_count), 0)
    FROM chapters
    WHERE story_id = NEW.story_id
  ),
  updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.story_id;

  UPDATE stories
  SET view_count = (
    SELECT COALESCE(SUM(view_count), 0)
    FROM chapters
    WHERE story_id = OLD.story_id
  ),
  updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.story_id
    AND OLD.story_id <> NEW.story_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_chapters_sync_story_views_after_delete
AFTER DELETE ON chapters
BEGIN
  UPDATE stories
  SET view_count = (
    SELECT COALESCE(SUM(view_count), 0)
    FROM chapters
    WHERE story_id = OLD.story_id
  ),
  updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.story_id;
END;
