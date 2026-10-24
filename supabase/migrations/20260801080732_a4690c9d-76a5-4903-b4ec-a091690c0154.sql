ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'ember',
  ADD COLUMN IF NOT EXISTS feed_tags text[] NOT NULL DEFAULT '{}'::text[];