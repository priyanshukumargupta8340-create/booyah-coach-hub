CREATE TABLE public.ai_coach_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL DEFAULT 'New tactical briefing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_coach_threads TO authenticated;
GRANT ALL ON public.ai_coach_threads TO service_role;
ALTER TABLE public.ai_coach_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can view their own tactical threads"
  ON public.ai_coach_threads FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Players can create their own tactical threads"
  ON public.ai_coach_threads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Players can update their own tactical threads"
  ON public.ai_coach_threads FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Players can delete their own tactical threads"
  ON public.ai_coach_threads FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.ai_coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.ai_coach_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  role TEXT NOT NULL,
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_coach_messages_role_valid CHECK (role IN ('user', 'assistant'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_coach_messages TO authenticated;
GRANT ALL ON public.ai_coach_messages TO service_role;
ALTER TABLE public.ai_coach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can view their own tactical messages"
  ON public.ai_coach_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.ai_coach_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()
  ));
CREATE POLICY "Players can create their own tactical messages"
  ON public.ai_coach_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.ai_coach_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()
  ));
CREATE POLICY "Players can update their own tactical messages"
  ON public.ai_coach_messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.ai_coach_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()
  )) WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.ai_coach_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()
  ));
CREATE POLICY "Players can delete their own tactical messages"
  ON public.ai_coach_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.ai_coach_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()
  ));

CREATE INDEX ai_coach_threads_user_updated_idx ON public.ai_coach_threads(user_id, updated_at DESC);
CREATE INDEX ai_coach_messages_thread_created_idx ON public.ai_coach_messages(thread_id, created_at ASC);

CREATE OR REPLACE FUNCTION private.touch_ai_coach_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  UPDATE public.ai_coach_threads SET updated_at = now() WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.touch_ai_coach_thread() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.touch_ai_coach_thread() TO service_role;
CREATE TRIGGER touch_ai_coach_thread_after_message
AFTER INSERT OR UPDATE ON public.ai_coach_messages
FOR EACH ROW EXECUTE FUNCTION private.touch_ai_coach_thread();