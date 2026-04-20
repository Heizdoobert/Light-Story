# Light Story Database Schema (MVP)

## Tables
- profiles
- stories
- chapters
- site_settings
- story_likes

## Key Relationships
- profiles.id -> auth.users.id
- stories.created_by -> profiles.id
- chapters.story_id -> stories.id
- story_likes.story_id -> stories.id
- story_likes.user_id -> profiles.id

## Notes
- `site_settings.value` uses `jsonb` for flexible typed configuration.
- `stories.status` supports `draft`, `ongoing`, `completed`, `archived`.
- `chapters` enforces unique `(story_id, chapter_number)`.
- `word_count` is generated from `content` for lightweight analytics.
