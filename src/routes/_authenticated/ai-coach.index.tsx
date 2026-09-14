import { createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ai-coach/")({
  beforeLoad: async () => {
    const { data, error } = await supabase
      .from("ai_coach_threads")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    let threadId = data?.[0]?.id;
    if (!threadId) {
      const { data: created, error: createError } = await supabase
        .from("ai_coach_threads")
        .insert({ title: "New tactical briefing" })
        .select("id")
        .single();
      if (createError) throw createError;
      threadId = created.id;
    }
    throw redirect({ to: "/ai-coach/$threadId", params: { threadId } });
  },
});