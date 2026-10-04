ALTER TABLE public.coach_profiles
  ADD COLUMN availability jsonb NOT NULL DEFAULT '{"0":["10:00 AM","12:00 PM","2:00 PM","4:00 PM","6:00 PM","8:00 PM"],"1":["10:00 AM","12:00 PM","2:00 PM","4:00 PM","6:00 PM","8:00 PM"],"2":["10:00 AM","12:00 PM","2:00 PM","4:00 PM","6:00 PM","8:00 PM"],"3":["10:00 AM","12:00 PM","2:00 PM","4:00 PM","6:00 PM","8:00 PM"],"4":["10:00 AM","12:00 PM","2:00 PM","4:00 PM","6:00 PM","8:00 PM"],"5":["10:00 AM","12:00 PM","2:00 PM","4:00 PM","6:00 PM","8:00 PM"],"6":["10:00 AM","12:00 PM","2:00 PM","4:00 PM","6:00 PM","8:00 PM"]}'::jsonb;

ALTER TABLE public.bookings ADD COLUMN coach_handle text;
CREATE UNIQUE INDEX bookings_no_double_booking
  ON public.bookings (lower(coach_handle), selected_date, time_slot)
  WHERE coach_handle IS NOT NULL;

-- Public, PII-free list of taken slots for one coach
CREATE OR REPLACE FUNCTION public.get_booked_slots(_coach text, _from date, _to date)
RETURNS TABLE (selected_date date, time_slot text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.selected_date, b.time_slot FROM public.bookings b
  WHERE lower(b.coach_handle) = lower(_coach)
    AND b.selected_date BETWEEN _from AND _to
    AND _to - _from <= 31;
$$;
REVOKE ALL ON FUNCTION public.get_booked_slots(text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booked_slots(text, date, date) TO anon, authenticated;

-- Reject bookings outside a registered coach's availability
CREATE OR REPLACE FUNCTION private.validate_booking_slot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE avail jsonb;
BEGIN
  IF NEW.coach_handle IS NULL THEN RETURN NEW; END IF;
  SELECT availability INTO avail FROM public.coach_profiles
    WHERE lower(handle) = lower(NEW.coach_handle) AND status = 'approved' LIMIT 1;
  IF avail IS NOT NULL AND NOT COALESCE(avail -> extract(dow FROM NEW.selected_date)::int::text ? NEW.time_slot, false) THEN
    RAISE EXCEPTION 'Coach is not available at this time' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_booking_slot BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION private.validate_booking_slot();