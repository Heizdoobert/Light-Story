-- Migration: Create drive_cbz_index table for Google Drive Cold Storage
-- Stores metadata mapping for CBZ/ZIP chapter packages on Google Drive

CREATE TABLE IF NOT EXISTS public.drive_cbz_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comic_slug VARCHAR(120) NOT NULL,
    chapter_number NUMERIC NOT NULL,
    gdrive_file_id VARCHAR(100) NOT NULL UNIQUE,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    page_count INT DEFAULT 0,
    is_masked BOOLEAN DEFAULT TRUE,
    storage_tier VARCHAR(20) DEFAULT 'cold_gdrive',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_comic_chapter UNIQUE (comic_slug, chapter_number)
);

-- Index for O(1) lookups by comic slug and chapter number
CREATE INDEX IF NOT EXISTS idx_drive_cbz_lookup 
ON public.drive_cbz_index (comic_slug, chapter_number);

-- Enable RLS
ALTER TABLE public.drive_cbz_index ENABLE ROW LEVEL SECURITY;

-- Allow public read access to CBZ metadata for catalog lookups
CREATE POLICY "Allow public read access to drive_cbz_index"
ON public.drive_cbz_index FOR SELECT
TO anon, authenticated
USING (true);

-- Allow service role full management
CREATE POLICY "Allow service_role full access to drive_cbz_index"
ON public.drive_cbz_index FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
