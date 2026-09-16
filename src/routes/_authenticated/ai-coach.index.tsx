import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ai-coach/")({
  component: TacticalCoachEntry,
});

function TacticalCoachEntry() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function openConversation() {
      const { data, error: loadError } = await supabase
        .from("ai_coach_threads")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1);
      if (loadError) return active && setError(loadError.message);
      let threadId = data?.[0]?.id;
      if (!threadId) {
        const { data: created, error: createError } = await supabase
          .from("ai_coach_threads")
          .insert({ title: "New tactical briefing" })
          .select("id")
          .single();
        if (createError) return active && setError(createError.message);
        threadId = created.id;
      }
      if (active) navigate({ to: "/ai-coach/$threadId", params: { threadId }, replace: true });
    }
    void openConversation();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <p className="text-sm text-muted-foreground">{error ?? "Opening tactical briefing…"}</p>
    </main>
  );
}