import { createFileRoute } from "@tanstack/react-router";

import { SessionList, SessionShell } from "@/components/session-list";

export const Route = createFileRoute("/_authenticated/my-sessions")({
  head: () => ({
    meta: [
      { title: "My Sessions — BooyahCoach" },
      { name: "description", content: "Your upcoming and past Free Fire coaching sessions with status and meeting links." },
      { property: "og:title", content: "My Coaching Sessions — BooyahCoach" },
      { property: "og:description", content: "Track booked Free Fire coaching sessions and join with one tap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MySessions,
});

function MySessions() {
  const { user } = Route.useRouteContext();
  return (
    <SessionShell title="My Sessions" subtitle="Bookings made while signed in to this account, with status and meeting links.">
      <SessionList mode="player" filter={{ column: "user_id", value: user.id }} />
    </SessionShell>
  );
}
