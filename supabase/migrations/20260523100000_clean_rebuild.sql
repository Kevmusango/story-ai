-- ============================================================
-- CLEAN REBUILD: Drop old schema, build new product schema
-- ============================================================

-- Drop old tables (old product)
DROP TABLE IF EXISTS videos CASCADE;
DROP TABLE IF EXISTS variation_memory CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop old types
DROP TYPE IF EXISTS platform_format CASCADE;
DROP TYPE IF EXISTS subscription_plan CASCADE;
DROP TYPE IF EXISTS video_mode CASCADE;
DROP TYPE IF EXISTS video_status CASCADE;

-- ============================================================
-- NEW SCHEMA: Emotional Targeting Ad Engine
-- ============================================================

-- profiles (linked 1:1 to auth.users)
CREATE TABLE profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT,
  avatar_url   TEXT,
  plan         TEXT        NOT NULL DEFAULT 'free',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile row when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- credits (one row per user)
CREATE TABLE credits (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  balance    INTEGER     NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create credit row when profile is created
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.credits (user_id, balance) VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile();

-- projects (one per generation session)
CREATE TABLE projects (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title            TEXT,
  business_type    TEXT,
  content_goal     TEXT        CHECK (content_goal IN ('paid_ad', 'organic')),
  persona          TEXT,
  emotional_angle  TEXT,
  status           TEXT        NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft', 'analyzing', 'angles_ready', 'generating', 'complete', 'failed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- uploads (media files attached to a project)
CREATE TABLE uploads (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_url     TEXT        NOT NULL,
  file_type    TEXT        NOT NULL CHECK (file_type IN ('image', 'video')),
  mime_type    TEXT,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- generations (AI analysis + script output per project)
CREATE TABLE generations (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id            UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Phase 1: GPT-4o vision analysis
  media_analysis     JSONB,      -- {object, context, pain_point, desired_outcome}
  -- Phase 2: 5 generated angles
  angles             JSONB,      -- [{id, angle_type, headline, script, hook, cta}]
  selected_angle_id  TEXT,
  -- Phase 3: final script
  script             TEXT,
  hook               TEXT,
  cta                TEXT,
  -- Voice
  voice_style        TEXT        NOT NULL DEFAULT 'warm',
  voiceover_url      TEXT,
  -- Render
  status             TEXT        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'analyzing', 'angles_ready', 'generating', 'complete', 'failed')),
  error_message      TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- videos (final rendered MP4 output)
CREATE TABLE videos (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id    UUID        REFERENCES generations(id) ON DELETE SET NULL,
  project_id       UUID        REFERENCES projects(id) ON DELETE SET NULL,
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_url        TEXT,
  thumbnail_url    TEXT,
  duration_seconds INTEGER,
  render_status    TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (render_status IN ('pending', 'rendering', 'complete', 'failed')),
  render_error     TEXT,
  rendered_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects    ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos      ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- credits
CREATE POLICY "credits_select" ON credits FOR SELECT USING (auth.uid() = user_id);

-- projects
CREATE POLICY "projects_select" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (auth.uid() = user_id);

-- uploads
CREATE POLICY "uploads_select" ON uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "uploads_insert" ON uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "uploads_delete" ON uploads FOR DELETE USING (auth.uid() = user_id);

-- generations
CREATE POLICY "generations_select" ON generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "generations_insert" ON generations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "generations_update" ON generations FOR UPDATE USING (auth.uid() = user_id);

-- videos
CREATE POLICY "videos_select" ON videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "videos_insert" ON videos FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET: media (user uploads + rendered videos)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  104857600, -- 100MB
  ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','audio/mpeg']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "media_public_read"  ON storage.objects FOR SELECT  USING (bucket_id = 'media');
CREATE POLICY "media_auth_insert"  ON storage.objects FOR INSERT  WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');
CREATE POLICY "media_owner_delete" ON storage.objects FOR DELETE  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
