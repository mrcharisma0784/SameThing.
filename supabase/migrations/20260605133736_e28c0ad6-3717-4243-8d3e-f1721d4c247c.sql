
-- 1) VOTES: remove public read, restrict to owner
DROP POLICY IF EXISTS "votes public read" ON public.votes;
CREATE POLICY "votes select own" ON public.votes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
REVOKE SELECT ON public.votes FROM anon;

-- 2) THINGS / COMMENTS: revoke column SELECT on user_id from clients.
--    Server functions use service_role (supabaseAdmin) and mask the value before returning.
REVOKE SELECT ON public.things FROM anon, authenticated;
GRANT SELECT (
  id, raw_text, simplified_text, title, language, tags,
  is_anonymous, is_open_to_chat, same_count, nah_count, total_votes,
  similarity_score, comment_count, safety_flag, hidden,
  is_rare_thing, rare_locked_at, report_count, created_at, updated_at
) ON public.things TO anon, authenticated;

REVOKE SELECT ON public.comments FROM anon, authenticated;
GRANT SELECT (
  id, thing_id, text, is_anonymous, hidden, report_count, created_at
) ON public.comments TO anon, authenticated;

-- 3) PROFILES: only expose public columns; private metadata stays server-side
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, username, emoji, bio, language, rare_thing_count) ON public.profiles TO anon, authenticated;

-- 4) Realtime broadcast/presence is unused by this app; deny by default.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all realtime channels" ON realtime.messages;
CREATE POLICY "deny all realtime channels" ON realtime.messages
  FOR SELECT TO authenticated, anon USING (false);
