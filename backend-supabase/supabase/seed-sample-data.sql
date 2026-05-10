-- Light Story MVP seed data with real sample content for development and testing
-- This script populates categories, authors, stories, chapters, and users

-- 1. Seed Categories
INSERT INTO public.categories (id, name, description, created_at, updated_at)
VALUES
  ('cat_001', 'Fantasy', 'Epic adventures in magical worlds', NOW(), NOW()),
  ('cat_002', 'Romance', 'Love stories and relationships', NOW(), NOW()),
  ('cat_003', 'Mystery', 'Detective and thriller stories', NOW(), NOW()),
  ('cat_004', 'Science Fiction', 'Future worlds and technology', NOW(), NOW()),
  ('cat_005', 'Historical Fiction', 'Stories set in historical periods', NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW();

-- 2. Seed Authors
INSERT INTO public.authors (id, name, bio, created_at, updated_at)
VALUES
  ('auth_001', 'Sarah Chen', 'Bestselling fantasy author known for intricate world-building', NOW(), NOW()),
  ('auth_002', 'Marcus Johnson', 'Romance novelist with a focus on contemporary relationships', NOW(), NOW()),
  ('auth_003', 'Elena Rodriguez', 'Mystery writer specializing in psychological thrillers', NOW(), NOW()),
  ('auth_004', 'David Kim', 'Science fiction author exploring futuristic societies', NOW(), NOW()),
  ('auth_005', 'Catherine Stone', 'Historical fiction expert bringing the past to life', NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, bio = EXCLUDED.bio, updated_at = NOW();

-- 3. Seed Stories
INSERT INTO public.stories (id, title, author, author_id, description, cover_url, category, category_id, status, views, created_at, updated_at)
VALUES
  ('story_001', 'The Crystal Realm', 'Sarah Chen', 'auth_001', 
   'A young mage discovers a hidden world where crystals hold ancient magic. She must master her powers before dark forces destroy everything she loves.',
   'https://images.unsplash.com/photo-1516979187457-635ffe35ebda?w=500&h=700&fit=crop', 'Fantasy', 'cat_001', 'published', 1250, NOW(), NOW()),
  
  ('story_002', 'Hearts in the City', 'Marcus Johnson', 'auth_002',
   'Two strangers meet in a bustling metropolis and discover that fate has more plans for them than they ever imagined.',
   'https://images.unsplash.com/photo-1507842217343-583f20270319?w=500&h=700&fit=crop', 'Romance', 'cat_002', 'published', 892, NOW(), NOW()),
  
  ('story_003', 'Shadows of Doubt', 'Elena Rodriguez', 'auth_003',
   'A detective races against time to solve a case that hits too close to home. Every clue leads to unexpected revelations.',
   'https://images.unsplash.com/photo-1488998427799-e21cff96606b?w=500&h=700&fit=crop', 'Mystery', 'cat_003', 'published', 1567, NOW(), NOW()),
  
  ('story_004', 'Beyond the Stars', 'David Kim', 'auth_004',
   'Humanity reaches the stars only to discover they were never alone. A first contact scenario that changes everything.',
   'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=500&h=700&fit=crop', 'Science Fiction', 'cat_004', 'published', 2341, NOW(), NOW()),
  
  ('story_005', 'The Forgotten Empire', 'Catherine Stone', 'auth_005',
   'Explore the rise and fall of a civilization lost to time, told through the eyes of those who lived it.',
   'https://images.unsplash.com/photo-1507842217343-583f20270319?w=500&h=700&fit=crop', 'Historical Fiction', 'cat_005', 'published', 756, NOW(), NOW()),
  
  ('story_006', 'Echoes of Eternity', 'Sarah Chen', 'auth_001',
   'When a cursed artifact awakens after centuries, a group of unlikely heroes must band together.',
   'https://images.unsplash.com/photo-1516979187457-635ffe35ebda?w=500&h=700&fit=crop', 'Fantasy', 'cat_001', 'draft', 0, NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title, description = EXCLUDED.description, views = EXCLUDED.views, updated_at = NOW();

-- 4. Seed Chapters for Story 001 (The Crystal Realm)
INSERT INTO public.chapters (id, story_id, chapter_number, title, content, created_at, updated_at)
VALUES
  ('ch_001', 'story_001', 1, 'Awakening',
   'The morning sun painted the sky in shades of amber and rose as Lyra stood at the edge of the cliff. She had felt it coming—the awakening of her powers. For years, the old magic had slumbered within her, waiting for this moment...',
   NOW(), NOW()),
  
  ('ch_002', 'story_001', 2, 'The Crystal Tower',
   'The tower materialized from the mist like a dream taking form. Its walls glimmered with the light of a thousand stars, each surface etched with runes Lyra could almost understand...',
   NOW(), NOW()),
  
  ('ch_003', 'story_001', 3, 'Trials of the Mage',
   'Master Theron watched as Lyra attempted the levitation spell for the hundredth time. Beads of sweat formed on her brow as she concentrated, feeling the magic flow through her veins...',
   NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();

-- 5. Seed Chapters for Story 002 (Hearts in the City)
INSERT INTO public.chapters (id, story_id, chapter_number, title, content, created_at, updated_at)
VALUES
  ('ch_004', 'story_002', 1, 'The Encounter',
   'The rain hammered against the windows of the corner café as Maya rushed inside, soaked to the bone. That\'s when she saw him—a stranger reading a worn copy of her favorite novel...',
   NOW(), NOW()),
  
  ('ch_005', 'story_002', 2, 'Coffee and Conversation',
   'They started talking about the book. Then they talked about life. Before either of them realized it, hours had passed and the café was closing for the night...',
   NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();

-- 6. Seed Chapters for Story 003 (Shadows of Doubt)
INSERT INTO public.chapters (id, story_id, chapter_number, title, content, created_at, updated_at)
VALUES
  ('ch_006', 'story_003', 1, 'The Case Opens',
   'Detective James Morrison stared at the crime scene photographs for the third time that night. Something about this case felt wrong. The victim was someone from his past—someone he thought he\'d left behind...',
   NOW(), NOW()),
  
  ('ch_007', 'story_003', 2, 'Hidden Connections',
   'As James dug deeper, he uncovered a web of connections that reached far beyond the initial crime. Each lead led to another question, another suspect, another secret...',
   NOW(), NOW()),
  
  ('ch_008', 'story_003', 3, 'The Truth Revealed',
   'The pieces came together in a moment of clarity. The truth was far more complex and personal than he could have imagined. James had to decide who to trust...',
   NOW(), NOW())
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();

-- 7. Seed Stories with Story Views (for analytics)
INSERT INTO public.story_views (id, story_id, viewed_by, viewed_at)
VALUES
  (gen_random_uuid(), 'story_001', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '7 days'),
  (gen_random_uuid(), 'story_001', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '6 days'),
  (gen_random_uuid(), 'story_002', '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), 'story_003', '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), 'story_004', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), 'story_001', '00000000-0000-0000-0000-000000000004', NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), 'story_002', '00000000-0000-0000-0000-000000000005', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'story_003', '00000000-0000-0000-0000-000000000001', NOW())
ON CONFLICT DO NOTHING;

-- 8. Insert System Settings
INSERT INTO public.site_settings (key, value)
VALUES
  ('ads_enabled', 'true'::jsonb),
  ('home_banner_text', '"Discover Stories Without Limits"'::jsonb),
  ('max_chapter_size', '10485760'::jsonb),
  ('max_cover_size', '5242880'::jsonb),
  ('featured_stories', '["story_001", "story_003", "story_004"]'::jsonb)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

-- 9. Log seed operation
INSERT INTO public.audit_logs (id, user_id, action, entity_type, entity_id, changes, ip_address, created_at)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000099', 'seed_data', 'system', 'seed', 
   '{"operation":"sample_data_population","timestamp":"' || NOW()::TEXT || '"}'::jsonb, 
   '127.0.0.1', NOW());

-- Summary
SELECT 
  (SELECT COUNT(*) FROM public.categories) as category_count,
  (SELECT COUNT(*) FROM public.authors) as author_count,
  (SELECT COUNT(*) FROM public.stories) as story_count,
  (SELECT COUNT(*) FROM public.chapters) as chapter_count,
  (SELECT COUNT(*) FROM public.story_views) as view_count;
