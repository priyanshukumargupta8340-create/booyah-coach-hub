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
  errorComponent: ({ error }) => (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <div className="max-w-lg text-center">
        <h1 className="font-display text-4xl">Tactical feed interrupted</h1>
        <p className="mt-3 text-sm text-muted-foreground">{(error instanceof Error && error.message) || "The coach screen could not load."}</p>
      </div>
    </main>
  ),
  component: TacticalCoachRoute,
});

function TacticalCoachRoute() {
  const { threadId } = Route.useParams();
  return <TacticalCoachPage key={threadId} threadId={threadId} />;
}