-- 1. Stories Table
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  category TEXT,
  status TEXT CHECK (status IN ('ongoing', 'completed')) DEFAULT 'ongoing',
  views INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Chapters Table
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Site Settings Table
CREATE TABLE site_settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT
);

-- 4. RLS Policies
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for stories" ON stories FOR SELECT USING (true);
CREATE POLICY "Admin write access for stories" ON stories FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read access for chapters" ON chapters FOR SELECT USING (true);
CREATE POLICY "Admin write access for chapters" ON chapters FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read access for site_settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Admin write access for site_settings" ON site_settings FOR ALL USING (auth.role() = 'authenticated');

-- 5. RPC for view increment
CREATE OR REPLACE FUNCTION increment_story_views(story_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE stories SET views = views + 1 WHERE id = story_id_param;
END;
$$ LANGUAGE plpgsql;
