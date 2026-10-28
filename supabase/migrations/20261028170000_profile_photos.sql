ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_photo_change_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_photo_change_count integer NOT NULL DEFAULT 0;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-photos', 'profile-photos', true, 5242880, ARRAY['image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/webp','image/gif'];

DROP POLICY IF EXISTS "Public can read profile photos" ON storage.objects;
CREATE POLICY "Public can read profile photos" ON storage.objects FOR SELECT USING (bucket_id = 'profile-photos');
DROP POLICY IF EXISTS "Users can upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete profile photos" ON storage.objects;

CREATE OR REPLACE FUNCTION public.set_profile_avatar(_user_id uuid, _avatar_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE today_utc date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  UPDATE public.profiles
  SET avatar_url = _avatar_url,
      profile_photo_change_count = CASE WHEN profile_photo_change_date = today_utc THEN profile_photo_change_count + 1 ELSE 1 END,
      profile_photo_change_date = today_utc,
      updated_at = now()
  WHERE id = _user_id
    AND (profile_photo_change_date IS DISTINCT FROM today_utc OR profile_photo_change_count < 3);
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN RETURN jsonb_build_object('ok', false, 'reason', 'daily_limit'); END IF;
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.set_profile_avatar(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_avatar(uuid, text) TO service_role;
