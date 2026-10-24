
-- =========================================================================
-- SameThing. core schema
-- =========================================================================

-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE POLICY "user_roles self read" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- profiles
-- =========================================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  emoji text NOT NULL DEFAULT '✦',
  bio text,
  language text NOT NULL DEFAULT 'en',
  is_anon_default boolean NOT NULL DEFAULT true,
  last_post_at timestamptz,
  last_comment_at timestamptz,
  rare_thing_count integer NOT NULL DEFAULT 0,
  onboarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles self update" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles self insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- =========================================================================
-- things (posts)
-- =========================================================================
CREATE TABLE public.things (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  raw_text text NOT NULL,
  simplified_text text NOT NULL,
  title text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  tags text[] NOT NULL DEFAULT '{}',
  is_anonymous boolean NOT NULL DEFAULT true,
  is_open_to_chat boolean NOT NULL DEFAULT false,
  similarity_score real NOT NULL DEFAULT 0,
  same_count integer NOT NULL DEFAULT 0,
  nah_count integer NOT NULL DEFAULT 0,
  total_votes integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  safety_flag boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  is_rare_thing boolean NOT NULL DEFAULT false,
  rare_locked_at timestamptz,
  report_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX things_created_idx ON public.things (created_at DESC);
CREATE INDEX things_language_idx ON public.things (language);
CREATE INDEX things_user_idx ON public.things (user_id);
CREATE INDEX things_tags_idx ON public.things USING GIN (tags);

GRANT SELECT ON public.things TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.things TO authenticated;
GRANT ALL ON public.things TO service_role;
ALTER TABLE public.things ENABLE ROW LEVEL SECURITY;

CREATE POLICY "things public read" ON public.things
  FOR SELECT USING (hidden = false OR auth.uid() = user_id OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "things insert own" ON public.things
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "things update own" ON public.things
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "things delete own or mod" ON public.things
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- votes
-- =========================================================================
CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thing_id uuid NOT NULL REFERENCES public.things(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('same','nah')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thing_id, user_id)
);

CREATE INDEX votes_thing_idx ON public.votes (thing_id);
CREATE INDEX votes_user_idx ON public.votes (user_id);

GRANT SELECT ON public.votes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.votes TO authenticated;
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "votes public read" ON public.votes FOR SELECT USING (true);
CREATE POLICY "votes insert own" ON public.votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes update own" ON public.votes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes delete own" ON public.votes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================================
-- comments
-- =========================================================================
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thing_id uuid NOT NULL REFERENCES public.things(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  text text NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT true,
  hidden boolean NOT NULL DEFAULT false,
  report_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX comments_thing_idx ON public.comments (thing_id, created_at DESC);

GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments public read" ON public.comments
  FOR SELECT USING (hidden = false OR auth.uid() = user_id OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "comments insert own" ON public.comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments delete own or mod" ON public.comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- reports
-- =========================================================================
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('thing','comment')),
  target_id uuid NOT NULL,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, reporter_id)
);

GRANT INSERT ON public.reports TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.reports TO service_role;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports insert authenticated" ON public.reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports read mods" ON public.reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- Triggers / functions
-- =========================================================================

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER things_touch BEFORE UPDATE ON public.things
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Create profile on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_username text;
  candidate text;
  suffix int := 0;
  emojis text[] := ARRAY['✦','✧','✺','✶','✷','✸','✹','❂','◉','◍','◐','◑','◒','◓','✿','❀','❁','❃','❄','❅','❆','❉','❋','✦'];
BEGIN
  base_username := lower(regexp_replace(coalesce(split_part(NEW.email, '@', 1), 'thinker'), '[^a-z0-9_]', '', 'g'));
  IF base_username = '' THEN base_username := 'thinker'; END IF;
  candidate := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    suffix := suffix + 1;
    candidate := base_username || suffix::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, emoji, language)
  VALUES (
    NEW.id,
    candidate,
    emojis[1 + floor(random() * array_length(emojis,1))::int],
    'en'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recompute vote aggregates on a thing
CREATE OR REPLACE FUNCTION public.recompute_thing_votes(_thing_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  s int; n int; t int; score real;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE vote_type = 'same'),
    COUNT(*) FILTER (WHERE vote_type = 'nah'),
    COUNT(*)
  INTO s, n, t
  FROM public.votes WHERE thing_id = _thing_id;
  IF t > 0 THEN score := (s::real / t::real) * 100.0; ELSE score := 0; END IF;
  UPDATE public.things
    SET same_count = s, nah_count = n, total_votes = t, similarity_score = score
    WHERE id = _thing_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.votes_after_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_thing_votes(OLD.thing_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_thing_votes(NEW.thing_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER votes_aggregate
  AFTER INSERT OR UPDATE OR DELETE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.votes_after_change();

-- Comment count maintenance
CREATE OR REPLACE FUNCTION public.comments_after_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.things SET comment_count = comment_count + 1 WHERE id = NEW.thing_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.things SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.thing_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER comments_count_trg
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.comments_after_change();

-- Reports: bump counts + auto-hide threshold
CREATE OR REPLACE FUNCTION public.reports_after_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.target_type = 'thing' THEN
    UPDATE public.things SET report_count = report_count + 1,
      hidden = (report_count + 1 >= 5) OR hidden
      WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'comment' THEN
    UPDATE public.comments SET report_count = report_count + 1,
      hidden = (report_count + 1 >= 3) OR hidden
      WHERE id = NEW.target_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reports_trg AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.reports_after_insert();

-- =========================================================================
-- Realtime
-- =========================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.things;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER TABLE public.things REPLICA IDENTITY FULL;
ALTER TABLE public.votes REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
