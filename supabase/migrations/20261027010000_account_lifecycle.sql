-- Autonomous account deletion and export lifecycle.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_cancelled_until timestamptz;

CREATE TABLE IF NOT EXISTS public.account_data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('export', 'deletion')),
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz,
  handled_at timestamptz,
  email_sent_at timestamptz,
  admin_note text
);

ALTER TABLE public.account_data_requests
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_note text;

CREATE INDEX IF NOT EXISTS account_data_requests_user_type_idx
  ON public.account_data_requests(user_id, request_type, requested_at DESC);
CREATE INDEX IF NOT EXISTS account_data_requests_due_idx
  ON public.account_data_requests(request_type, status, scheduled_for);

ALTER TABLE public.account_data_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own account data requests" ON public.account_data_requests;
CREATE POLICY "users read own account data requests"
  ON public.account_data_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.account_data_requests TO authenticated;
GRANT ALL ON public.account_data_requests TO service_role;
