
-- Notification prefs + terms acceptance + RareThing permanent flag
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{"same":true,"nah":true,"comment":true,"mention":true,"only_one":true,"system":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

ALTER TABLE public.things
  ADD COLUMN IF NOT EXISTS only_one_permanent boolean NOT NULL DEFAULT false;

-- Update the vote-recompute function to also set only_one_permanent + is_rare_thing tiers.
CREATE OR REPLACE FUNCTION public.recompute_thing_votes(_thing_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s int; n int; t int; score real; rare boolean; permanent boolean;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE vote_type = 'same'),
    COUNT(*) FILTER (WHERE vote_type = 'nah'),
    COUNT(*)
  INTO s, n, t
  FROM public.votes WHERE thing_id = _thing_id;
  IF t > 0 THEN score := (s::real / t::real) * 100.0; ELSE score := 0; END IF;

  -- RareThing tiers:
  --   >= 100 votes AND same-ratio <= 2%   => rare badge (active while ratio holds)
  --   >= 1000 votes AND same-ratio <= 1%  => permanent "The only one." (never drops)
  --   > 5% same-ratio                     => rare badge drops
  rare := (t >= 100 AND score <= 2.0);
  permanent := (t >= 1000 AND score <= 1.0);
  IF score > 5.0 THEN rare := false; END IF;

  UPDATE public.things
    SET same_count = s,
        nah_count = n,
        total_votes = t,
        similarity_score = score,
        is_rare_thing = COALESCE(only_one_permanent, false) OR rare OR is_rare_thing AND false, -- recomputed below
        only_one_permanent = COALESCE(only_one_permanent, false) OR permanent
    WHERE id = _thing_id;

  -- Simpler explicit recompute for is_rare_thing (permanent OR current-tier rare):
  UPDATE public.things
    SET is_rare_thing = (only_one_permanent OR rare)
    WHERE id = _thing_id;
END;
$function$;
