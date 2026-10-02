CREATE TYPE public.coach_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.coach_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid(),
  display_name text NOT NULL,
  handle text NOT NULL,
  free_fire_uid text NOT NULL,
  rank text NOT NULL,
  region text NOT NULL,
  languages text NOT NULL,
  price integer NOT NULL,
  specialties text[] NOT NULL DEFAULT '{}',
  bio text NOT NULL,
  proof_path text NOT NULL,
  status public.coach_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coach_profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.coach_profiles TO authenticated;
GRANT ALL ON public.coach_profiles TO service_role;
ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved coaches" ON public.coach_profiles FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Coaches view own profile" ON public.coach_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all coach profiles" ON public.coach_profiles FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Coaches create own profile" ON public.coach_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Coaches update own profile" ON public.coach_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins update coach profiles" ON public.coach_profiles FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- Non-admins can never self-approve: any insert/edit by a non-admin resets to pending
CREATE OR REPLACE FUNCTION private.coach_profile_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN
    NEW.status := 'pending';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER coach_profile_guard BEFORE INSERT OR UPDATE ON public.coach_profiles
FOR EACH ROW EXECUTE FUNCTION private.coach_profile_guard();

CREATE POLICY "Coaches upload own rank proof" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'rank-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Coaches replace own rank proof" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'rank-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Coaches and admins view rank proofs" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'rank-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.has_role(auth.uid(), 'admin')));