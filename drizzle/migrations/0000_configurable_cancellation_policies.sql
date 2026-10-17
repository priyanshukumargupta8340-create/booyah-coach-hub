ALTER TABLE public.coach_profiles ADD COLUMN cancellation_policy jsonb NOT NULL DEFAULT '{"hours":0,"late_action":"fee","fee_percent":0}'::jsonb;
ALTER TABLE public.bookings ADD COLUMN cancellation_policy jsonb, ADD COLUMN starts_at timestamptz, ADD COLUMN cancellation_fee integer NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION private.validate_cancellation_policy() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF jsonb_typeof(NEW.cancellation_policy) <> 'object' OR NOT (NEW.cancellation_policy ?& ARRAY['hours','late_action','fee_percent']) OR COALESCE(NEW.cancellation_policy->>'hours','') !~ '^[0-9]+$' OR COALESCE(NEW.cancellation_policy->>'fee_percent','') !~ '^[0-9]+$' OR (NEW.cancellation_policy->>'hours')::integer NOT BETWEEN 0 AND 168 OR (NEW.cancellation_policy->>'fee_percent')::integer NOT BETWEEN 0 AND 100 OR COALESCE(NEW.cancellation_policy->>'late_action','') NOT IN ('block','fee') THEN RAISE EXCEPTION 'Set a cancellation deadline from 0 to 168 hours and a fee from 0 to 100 percent'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_coach_cancellation_policy BEFORE INSERT OR UPDATE ON public.coach_profiles FOR EACH ROW EXECUTE FUNCTION private.validate_cancellation_policy();
CREATE OR REPLACE FUNCTION private.snapshot_booking_cancellation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE policy jsonb;
BEGIN
 SELECT c.cancellation_policy INTO policy FROM public.coach_profiles c WHERE lower(c.handle)=lower(NEW.coach_handle) AND c.status='approved' LIMIT 1;
 policy := COALESCE(policy, '{"hours":0,"late_action":"fee","fee_percent":0}'::jsonb);
 IF NEW.cancellation_policy IS NOT NULL AND NEW.cancellation_policy IS DISTINCT FROM policy THEN RAISE EXCEPTION 'Cancellation policy changed. Reopen the booking form to review the latest terms.' USING ERRCODE='22023'; END IF;
 NEW.cancellation_policy := policy;
 NEW.starts_at := (NEW.selected_date + to_timestamp(NEW.time_slot, 'HH12:MI AM')::time) AT TIME ZONE 'Asia/Kolkata';
 NEW.cancellation_fee := 0;
 RETURN NEW;
END; $$;
CREATE TRIGGER snapshot_booking_cancellation BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION private.snapshot_booking_cancellation();
SELECT set_config('app.cancelling','on',true);
UPDATE public.bookings SET cancellation_policy='{"hours":0,"late_action":"fee","fee_percent":0}'::jsonb, starts_at=(selected_date + to_timestamp(time_slot, 'HH12:MI AM')::time) AT TIME ZONE 'Asia/Kolkata';
SELECT set_config('app.cancelling','off',true);
CREATE OR REPLACE FUNCTION private.booking_update_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF current_setting('app.cancelling', true) = 'on' THEN RETURN NEW; END IF;
 IF (NEW.cancellation_policy, NEW.starts_at, NEW.cancellation_fee) IS DISTINCT FROM (OLD.cancellation_policy, OLD.starts_at, OLD.cancellation_fee) THEN RAISE EXCEPTION 'Booked cancellation terms cannot be changed'; END IF;
 IF private.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
 IF OLD.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'This booking was cancelled'; END IF;
 IF NEW.meeting_link IS NOT NULL AND NEW.meeting_link !~ '^https://' THEN RAISE EXCEPTION 'Meeting link must start with https://'; END IF;
 IF (NEW.free_fire_uid, NEW.ign, NEW.whatsapp, NEW.session_type, NEW.selected_date, NEW.time_slot, NEW.coach_handle, NEW.user_id, NEW.amount, NEW.created_at, NEW.cancelled_at, NEW.cancelled_by) IS DISTINCT FROM (OLD.free_fire_uid, OLD.ign, OLD.whatsapp, OLD.session_type, OLD.selected_date, OLD.time_slot, OLD.coach_handle, OLD.user_id, OLD.amount, OLD.created_at, OLD.cancelled_at, OLD.cancelled_by) THEN RAISE EXCEPTION 'Coaches can only change status and meeting link'; END IF;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.get_cancellation_quote(_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bookings; who text; deadline timestamptz; fee integer := 0; allowed boolean := true; reason text := NULL; late boolean;
BEGIN
 SELECT * INTO b FROM public.bookings WHERE id=_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to cancel this session'; END IF;
 IF b.user_id=auth.uid() THEN who := 'player'; ELSIF private.is_coach_of(b.coach_handle) THEN who := 'coach'; ELSIF private.has_role(auth.uid(), 'admin') THEN who := 'admin'; ELSE RAISE EXCEPTION 'You cannot cancel this booking'; END IF;
 deadline := b.starts_at - make_interval(hours => (b.cancellation_policy->>'hours')::integer);
 late := now() > deadline;
 IF b.cancelled_at IS NOT NULL THEN allowed := false; reason := 'This session is already cancelled.';
 ELSIF b.status='completed' THEN allowed := false; reason := 'Completed sessions cannot be cancelled.';
 ELSIF now() >= b.starts_at THEN allowed := false; reason := 'Sessions cannot be cancelled after their start time.';
 ELSIF who='player' AND late THEN
  IF b.cancellation_policy->>'late_action'='block' THEN allowed := false; reason := 'The cancellation deadline has passed. Contact your coach.';
  ELSE fee := round(COALESCE(b.amount,0) * (b.cancellation_policy->>'fee_percent')::numeric / 100)::integer; END IF;
 END IF;
 RETURN jsonb_build_object('allowed',allowed,'reason',reason,'fee',fee,'deadline',deadline,'starts_at',b.starts_at,'late',late,'actor',who,'policy',b.cancellation_policy);
END; $$;
REVOKE ALL ON FUNCTION public.get_cancellation_quote(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cancellation_quote(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.cancel_booking_with_policy(_id uuid, _accepted_fee integer DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE quote jsonb;
BEGIN
 PERFORM 1 FROM public.bookings WHERE id=_id FOR UPDATE;
 quote := public.get_cancellation_quote(_id);
 IF NOT (quote->>'allowed')::boolean THEN RAISE EXCEPTION '%', quote->>'reason'; END IF;
 IF ((quote->>'fee')::integer > 0 AND _accepted_fee IS NULL) OR (_accepted_fee IS NOT NULL AND _accepted_fee <> (quote->>'fee')::integer) THEN RAISE EXCEPTION 'Cancellation fee changed. Review the updated fee before confirming.'; END IF;
 PERFORM set_config('app.cancelling','on',true);
 UPDATE public.bookings SET cancelled_at=now(), cancelled_by=quote->>'actor', cancellation_fee=(quote->>'fee')::integer WHERE id=_id;
 PERFORM set_config('app.cancelling','off',true);
END; $$;
REVOKE ALL ON FUNCTION public.cancel_booking_with_policy(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking_with_policy(uuid,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.cancel_booking(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN PERFORM public.cancel_booking_with_policy(_id,NULL); END; $$;