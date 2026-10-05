ALTER TABLE public.coach_profiles
  ADD COLUMN session_prices jsonb NOT NULL DEFAULT '{"vod":199,"scrim":399,"aim":299}'::jsonb;

ALTER TABLE public.bookings
  ADD COLUMN user_id uuid DEFAULT auth.uid(),
  ADD COLUMN meeting_link text,
  ADD COLUMN amount integer;
CREATE INDEX bookings_user_id_idx ON public.bookings(user_id);

DROP POLICY IF EXISTS "Anyone can submit a booking" ON public.bookings;
CREATE POLICY "Anyone can submit a booking" ON public.bookings FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE OR REPLACE FUNCTION private.is_coach_of(_handle text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _handle IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.coach_profiles c
    WHERE c.user_id = auth.uid() AND lower(c.handle) = lower(_handle) AND c.status = 'approved');
$$;
REVOKE ALL ON FUNCTION private.is_coach_of(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_coach_of(text) TO authenticated;

CREATE POLICY "Players view own bookings" ON public.bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Coaches view their bookings" ON public.bookings FOR SELECT TO authenticated
  USING (private.is_coach_of(coach_handle));
CREATE POLICY "Coaches update their bookings" ON public.bookings FOR UPDATE TO authenticated
  USING (private.is_coach_of(coach_handle)) WITH CHECK (private.is_coach_of(coach_handle));

CREATE OR REPLACE FUNCTION private.booking_update_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF private.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF NEW.meeting_link IS NOT NULL AND NEW.meeting_link !~ '^https://' THEN
    RAISE EXCEPTION 'Meeting link must start with https://';
  END IF;
  IF (NEW.free_fire_uid, NEW.ign, NEW.whatsapp, NEW.session_type, NEW.selected_date, NEW.time_slot, NEW.coach_handle, NEW.user_id, NEW.amount, NEW.created_at)
     IS DISTINCT FROM
     (OLD.free_fire_uid, OLD.ign, OLD.whatsapp, OLD.session_type, OLD.selected_date, OLD.time_slot, OLD.coach_handle, OLD.user_id, OLD.amount, OLD.created_at) THEN
    RAISE EXCEPTION 'Coaches can only change status and meeting link';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER booking_update_guard BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION private.booking_update_guard();