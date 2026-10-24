
-- system_messages: admin/system → user inbox
CREATE TABLE public.system_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'system', -- system | warning | feedback_reply | info
  title text NOT NULL,
  body text NOT NULL,
  link text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.system_messages TO authenticated;
GRANT ALL ON public.system_messages TO service_role;
ALTER TABLE public.system_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipients read own system messages"
  ON public.system_messages FOR SELECT
  TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "recipients mark own read"
  ON public.system_messages FOR UPDATE
  TO authenticated USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());
CREATE POLICY "admins manage all system messages"
  ON public.system_messages FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX system_messages_recipient_idx ON public.system_messages(recipient_id, created_at DESC);

-- banned_words
CREATE TABLE public.banned_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL UNIQUE,
  severity text NOT NULL DEFAULT 'warn', -- warn | block
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banned_words TO authenticated;
GRANT ALL ON public.banned_words TO service_role;
ALTER TABLE public.banned_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "everyone signed in can read banned words"
  ON public.banned_words FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage banned words"
  ON public.banned_words FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- profiles: ban fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS ban_reason text;

-- feedback: replied tracking
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS replied_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Seed a few common banned words as warnings (editable in admin panel)
INSERT INTO public.banned_words (word, severity) VALUES
  ('fuck','warn'),('shit','warn'),('bitch','warn'),('asshole','warn')
ON CONFLICT (word) DO NOTHING;
