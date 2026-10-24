
-- Make trigger helpers SECURITY DEFINER so they work without explicit user-facing grants
ALTER FUNCTION public.votes_after_change() SECURITY DEFINER;
ALTER FUNCTION public.comments_after_change() SECURITY DEFINER;
ALTER FUNCTION public.recompute_thing_votes(uuid) SECURITY DEFINER;

-- Revoke direct EXECUTE from external roles for internal-only functions
REVOKE EXECUTE ON FUNCTION public.recompute_thing_votes(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.votes_after_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.comments_after_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reports_after_insert() FROM PUBLIC, anon, authenticated;

-- has_role is safe to call (used by RLS policies as the requester)
-- leave its existing EXECUTE for authenticated/anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
