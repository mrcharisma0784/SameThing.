-- Feedback prompts can remain active for a bounded period or indefinitely.
ALTER TABLE public.feedback_prompts
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS feedback_prompts_active_expiry_idx
  ON public.feedback_prompts(active, expires_at, updated_at DESC);
