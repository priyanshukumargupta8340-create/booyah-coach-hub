CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','completed');

ALTER TABLE public.bookings ADD COLUMN status public.booking_status NOT NULL DEFAULT 'pending';

CREATE POLICY "Only admins can update bookings" ON public.bookings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;