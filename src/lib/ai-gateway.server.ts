import { createOpenAI } from "@ai-sdk/openai";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

export function createTacticalCoachModel(apiKey: string, request: Request) {
  let runId = request.headers.get("X-Lovable-AIG-Run-ID");
  const runIdFetch: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
    const response = await fetch(input, { ...init, headers });
    runId = response.headers.get("X-Lovable-AIG-Run-ID") ?? runId;
    return response;
  };

  const gateway = createOpenAI({
    apiKey,
    baseURL: GATEWAY_URL,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch,
  });

  return {
    model: gateway.responses("openai/gpt-6-astra"),
    getRunId: () => runId,
  };
}