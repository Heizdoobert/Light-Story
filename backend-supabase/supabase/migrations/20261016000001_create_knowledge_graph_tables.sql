-- Migration: Knowledge Graph entities, relations, and pgvector embeddings
-- Timestamp: 20261016000001

CREATE EXTENSION IF NOT EXISTS vector;

-- 1) Entities table (Nodes in Knowledge Graph)
CREATE TABLE IF NOT EXISTS public.kg_entities (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    description TEXT,
    embedding vector(1536),
    source_file TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2) Relations table (Edges in Knowledge Graph)
CREATE TABLE IF NOT EXISTS public.kg_relations (
    id BIGINT PRIMARY KEY,
    source_entity TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    description TEXT,
    weight REAL DEFAULT 1.0,
    source_file TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3) Indexes for graph traversal and lookup
CREATE INDEX IF NOT EXISTS idx_kg_entities_name ON public.kg_entities (name);
CREATE INDEX IF NOT EXISTS idx_kg_entities_type ON public.kg_entities (entity_type);
CREATE INDEX IF NOT EXISTS idx_kg_relations_src ON public.kg_relations (source_entity);
CREATE INDEX IF NOT EXISTS idx_kg_relations_tgt ON public.kg_relations (target_entity);
CREATE INDEX IF NOT EXISTS idx_kg_relations_type ON public.kg_relations (relation_type);

-- 4) Vector index for semantic search across entities (ivfflat)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_kg_entities_embedding' AND n.nspname = 'public'
    ) THEN
        EXECUTE 'CREATE INDEX idx_kg_entities_embedding ON public.kg_entities USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
    END IF;
END $$;

-- 5) Row Level Security (RLS)
ALTER TABLE public.kg_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_relations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'kg_entities' AND policyname = 'Public can view kg_entities'
    ) THEN
        CREATE POLICY "Public can view kg_entities" ON public.kg_entities FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'kg_relations' AND policyname = 'Public can view kg_relations'
    ) THEN
        CREATE POLICY "Public can view kg_relations" ON public.kg_relations FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'kg_entities' AND policyname = 'Service role can manage kg_entities'
    ) THEN
        CREATE POLICY "Service role can manage kg_entities" ON public.kg_entities USING (auth.role() = 'service_role');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'kg_relations' AND policyname = 'Service role can manage kg_relations'
    ) THEN
        CREATE POLICY "Service role can manage kg_relations" ON public.kg_relations USING (auth.role() = 'service_role');
    END IF;
END $$;
