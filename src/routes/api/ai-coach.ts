import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import type { Database } from "@/integrations/supabase/types";

type ChatBody = {
  threadId?: unknown;
  messages?: unknown;
};

const COACH_INSTRUCTIONS = `You are the AI Tactical Coach for BooyahCoach, an elite Free Fire Grandmaster coach.
You specialize in Clash Squad (CS Ranked) rush tactics, Battle Royale (BR) zone rotations, fast gloo wall placement, one-tap headshot mechanics, and character skill combinations featuring Tatsuya, Alok, Homer, and other current characters.

Coach like an experienced IGL: decisive, practical, motivating, and concise. Give concrete drills, positioning cues, timing windows, loadout or character choices, and common mistakes. Use short headings and numbered steps where useful. Tailor advice to the player's mode, device constraints, role, rank, and squad size when those details are known. If key details are missing, give a useful baseline first, then ask one focused follow-up question. Never claim guaranteed rank gains. Keep answers focused on legitimate gameplay and fair play.`;

function gatewayErrorResponse(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export const Route = createFileRoute("/api/ai-coach")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = request.headers.get("authorization");
        if (!authorization?.startsWith("Bearer ")) {
          return gatewayErrorResponse(401, "Sign in to use AI Tactical Coach.");
        }

        const body = (await request.json()) as ChatBody;
        if (typeof body.threadId !== "string" || !Array.isArray(body.messages)) {
          return gatewayErrorResponse(400, "A valid tactical conversation is required.");
        }

        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const lovableApiKey = process.env["LOVABLE_API_KEY"];
        if (!url || !key || !lovableApiKey) {
          return gatewayErrorResponse(500, "AI Tactical Coach is not configured yet.");
        }

        const token = authorization.slice("Bearer ".length);
        const supabase = createClient<Database>(url, key, {
          global: { headers: { Authorization: authorization } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
        const userId = claimsData?.claims?.sub;
        if (claimsError || !userId) {
          return gatewayErrorResponse(401, "Your sign-in has expired. Please sign in again.");
        }

        const { data: thread, error: threadError } = await supabase
          .from("ai_coach_threads")
          .select("id")
          .eq("id", body.threadId)
          .eq("user_id", userId)
          .maybeSingle();
        if (threadError || !thread) {
          return gatewayErrorResponse(403, "You do not have access to this conversation.");
        }

        try {
          const { createTacticalCoachModel } = await import("@/lib/ai-gateway.server");
          const { model, getRunId } = createTacticalCoachModel(lovableApiKey, request);
          const result = streamText({
            model,
            instructions: COACH_INSTRUCTIONS,
            messages: await convertToModelMessages(body.messages as UIMessage[]),
            abortSignal: request.signal,
            providerOptions: {
              openai: {
                forceReasoning: true,
                reasoningEffort: "medium",
                reasoningSummary: "auto",
                store: false,
                include: ["reasoning.encrypted_content"],
              },
            },
          });

          const response = result.toUIMessageStreamResponse({
            originalMessages: body.messages as UIMessage[],
            sendReasoning: true,
          });
          const headers = new Headers(response.headers);
          const runId = getRunId();
          if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
          return new Response(response.body, { status: response.status, headers });
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return gatewayErrorResponse(499, "Generation stopped.");
          }
          const status =
            typeof error === "object" && error !== null && "statusCode" in error
              ? Number(error.statusCode)
              : 500;
          const message = error instanceof Error ? error.message : "AI Tactical Coach could not respond.";
          return gatewayErrorResponse(Number.isFinite(status) ? status : 500, message);
        }
      },
    },
  },
});