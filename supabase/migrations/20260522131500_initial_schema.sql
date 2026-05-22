-- STORYLINE - Initial Schema Migration

-- Enums

CREATE TYPE public.platform_format AS ENUM (
  'tiktok',
  'instagram_reels',
  'youtube_shorts',
  'facebook_reels',
  'instagram_square',
  'youtube',
  'facebook'
);

CREATE TYPE public.video_mode AS ENUM ('quick', 'advanced', 'upload');

CREATE TYPE public.video_status AS ENUM ('pending', 'generating', 'complete', 'failed');

CREATE TYPE public.subscription_plan AS ENUM ('free', 'starter', 'growth', 'agency');

-- profiles table (extends auth.users)

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  avatar_url    TEXT,
  plan          public.subscription_plan DEFAULT 'free',
  video_credits INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- businesses table

CREATE TABLE public.businesses (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name          TEXT,
  type          TEXT NOT NULL,
  location      TEXT,
  city          TEXT,
  neighbourhood TEXT,
  goal          TEXT,
  website_url   TEXT,
  logo_url      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own businesses"
  ON public.businesses FOR ALL
  USING (auth.uid() = user_id);

-- videos table

CREATE TABLE public.videos (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  business_id      UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  mode             public.video_mode NOT NULL,
  platform         public.platform_format DEFAULT 'tiktok',
  archetype_used   TEXT,
  tone_used        TEXT,
  script_text      TEXT,
  opening_line     TEXT,
  asset_urls       JSONB DEFAULT '[]',
  stock_urls       JSONB DEFAULT '[]',
  output_url       TEXT,
  thumbnail_url    TEXT,
  status           public.video_status DEFAULT 'pending',
  duration_seconds INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own videos"
  ON public.videos FOR ALL
  USING (auth.uid() = user_id);

-- chat_sessions table

CREATE TABLE public.chat_sessions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  messages    JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chat sessions"
  ON public.chat_sessions FOR ALL
  USING (auth.uid() = user_id);

-- variation_memory table

CREATE TABLE public.variation_memory (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id       UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL UNIQUE,
  last_3_scripts    JSONB DEFAULT '[]',
  last_3_archetypes JSONB DEFAULT '[]',
  last_3_tones      JSONB DEFAULT '[]',
  last_3_openers    JSONB DEFAULT '[]',
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.variation_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage variation memory for own businesses"
  ON public.variation_memory FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = variation_memory.business_id
        AND businesses.user_id = auth.uid()
    )
  );

-- Trigger: auto-create profile on signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: updated_at timestamps

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER variation_memory_updated_at
  BEFORE UPDATE ON public.variation_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();