-- Allow mentions in things (comment_id nullable) + separate unique for thing-only mentions
ALTER TABLE public.mentions ALTER COLUMN comment_id DROP NOT NULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mentions_comment_id_mentioned_user_id_key') THEN
    ALTER TABLE public.mentions DROP CONSTRAINT mentions_comment_id_mentioned_user_id_key;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS mentions_comment_unique
  ON public.mentions(comment_id, mentioned_user_id) WHERE comment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS mentions_thing_only_unique
  ON public.mentions(thing_id, mentioned_user_id) WHERE comment_id IS NULL;