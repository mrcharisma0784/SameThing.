
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS warnings_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS muted_until timestamptz,
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','premium'));
