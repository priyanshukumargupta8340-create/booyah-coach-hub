import { createFileRoute } from "@tanstack/react-router";

import { TacticalCoachPage } from "@/components/tactical-coach-page";

export const Route = createFileRoute("/_authenticated/ai-coach/$threadId")({
  head: () => ({
    meta: [
      { title: "AI Tactical Coach — Free Fire Strategy" },
      {
        name: "description",
        content: "Get personalized Free Fire CS Ranked tactics, BR rotations, gloo wall drills, and character combinations.",
      },
      { property: "og:title", content: "AI Tactical Coach — BooyahCoach" },
      {
        property: "og:description",
        content: "Instant tactical coaching for Free Fire rushes, rotations, mechanics, and character skills.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TacticalCoachRoute,
});

function TacticalCoachRoute() {
  const { threadId } = Route.useParams();
  return <TacticalCoachPage key={threadId} threadId={threadId} />;
}