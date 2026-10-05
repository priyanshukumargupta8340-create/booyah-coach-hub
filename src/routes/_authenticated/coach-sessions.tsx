import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SessionList, SessionShell } from "@/components/session-list";

export const Route = createFileRoute("/_authenticated/coach-sessions")({
  head: () => ({
    meta: [
      { title: "Coach Bookings — BooyahCoach" },
      { name: "description", content: "Manage your incoming Free Fire coaching bookings, confirm sessions and share meeting links." },
      { property: "og:title", content: "Coach Bookings — BooyahCoach" },
      { property: "og:description", content: "Confirm sessions and share meeting links with your students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoachSessions,
});

function CoachSessions() {
  const { user } = Route.useRouteContext();
  const [handle, setHandle] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    void supabase.from("coach_profiles").select("handle, status").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setHandle(data?.status === "approved" ? data.handle : null));
  }, [user.id]);

  return (
    <SessionShell title="Coach Bookings" subtitle="Confirm sessions, add a meeting link and mark them completed.">
      {handle === undefined ? (
        <Loader2 className="mt-8 h-5 w-5 animate-spin text-muted-foreground" />
      ) : handle === null ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Only verified coaches can manage bookings.{" "}
          <Link to="/become-coach" className="text-gold underline">Check your coach profile</Link>.
        </p>
      ) : (
        <SessionList mode="coach" filter={{ column: "coach_handle", value: handle }} />
      )}
    </SessionShell>
  );
}
