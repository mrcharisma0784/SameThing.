
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS inbox_seen_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

CREATE INDEX IF NOT EXISTS comments_pinned_idx ON public.comments (thing_id, pinned_at DESC NULLS LAST);
