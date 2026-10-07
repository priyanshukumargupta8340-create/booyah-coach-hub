ALTER TABLE public.bookings ADD COLUMN cancelled_at timestamptz, ADD COLUMN cancelled_by text;
DROP INDEX public.bookings_no_double_booking;
CREATE UNIQUE INDEX bookings_no_double_booking ON public.bookings (lower(coach_handle), selected_date, time_slot) WHERE coach_handle IS NOT NULL AND cancelled_at IS NULL;

CREATE OR REPLACE FUNCTION public.get_booked_slots(_coach text, _from date, _to date)
 RETURNS TABLE(selected_date date, time_slot text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT b.selected_date, b.time_slot FROM public.bookings b
  WHERE lower(b.coach_handle) = lower(_coach) AND b.cancelled_at IS NULL
    AND b.selected_date BETWEEN _from AND _to AND _to - _from <= 31;
$$;

CREATE OR REPLACE FUNCTION private.booking_update_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('app.cancelling', true) = 'on' OR private.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF OLD.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'This booking was cancelled'; END IF;
  IF NEW.meeting_link IS NOT NULL AND NEW.meeting_link !~ '^https://' THEN
    RAISE EXCEPTION 'Meeting link must start with https://';
  END IF;
  IF (NEW.free_fire_uid, NEW.ign, NEW.whatsapp, NEW.session_type, NEW.selected_date, NEW.time_slot, NEW.coach_handle, NEW.user_id, NEW.amount, NEW.created_at, NEW.cancelled_at, NEW.cancelled_by)
     IS DISTINCT FROM
     (OLD.free_fire_uid, OLD.ign, OLD.whatsapp, OLD.session_type, OLD.selected_date, OLD.time_slot, OLD.coach_handle, OLD.user_id, OLD.amount, OLD.created_at, OLD.cancelled_at, OLD.cancelled_by) THEN
    RAISE EXCEPTION 'Coaches can only change status and meeting link';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_booking(_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE b public.bookings; who text;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF b.user_id IS NOT NULL AND b.user_id = auth.uid() THEN who := 'player';
  ELSIF private.is_coach_of(b.coach_handle) THEN who := 'coach';
  ELSIF private.has_role(auth.uid(), 'admin') THEN who := 'admin';
  ELSE RAISE EXCEPTION 'You cannot cancel this booking'; END IF;
  IF b.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'Already cancelled'; END IF;
  IF b.status = 'completed' THEN RAISE EXCEPTION 'Completed sessions cannot be cancelled'; END IF;
  IF b.selected_date < current_date THEN RAISE EXCEPTION 'Past sessions cannot be cancelled'; END IF;
  PERFORM set_config('app.cancelling', 'on', true);
  UPDATE public.bookings SET cancelled_at = now(), cancelled_by = who WHERE id = _id;
  PERFORM set_config('app.cancelling', 'off', true);
END; $$;
REVOKE ALL ON FUNCTION public.cancel_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;