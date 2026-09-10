CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  free_fire_uid TEXT NOT NULL,
  ign TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  session_type TEXT NOT NULL,
  selected_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.bookings TO anon;
GRANT INSERT ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a booking"
  ON public.bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);