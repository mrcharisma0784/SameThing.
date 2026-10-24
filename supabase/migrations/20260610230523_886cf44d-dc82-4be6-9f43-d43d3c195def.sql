
-- 1) Data API grants (tables had no role-level grants)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.things TO authenticated;
GRANT SELECT ON public.things TO anon;
GRANT ALL ON public.things TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT ON public.comments TO anon;
GRANT ALL ON public.comments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.votes TO authenticated;
GRANT ALL ON public.votes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 2) Vote aggregation function needs execute for authenticated (triggered via votes insert)
GRANT EXECUTE ON FUNCTION public.recompute_thing_votes(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.votes_after_change() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.comments_after_change() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reports_after_insert() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role, anon;

-- 3) Schema additions
ALTER TABLE public.things ADD COLUMN IF NOT EXISTS comments_closed boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS messages_open boolean NOT NULL DEFAULT false;
