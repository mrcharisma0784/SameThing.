export type CloudflareChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type CloudflareChatOptions = {
  response_format?: { type: "json_object" };
  temperature?: number;
  max_completion_tokens?: number;
  reasoning_effort?: "none" | "low" | "medium" | "high";
  signal?: AbortSignal;
};

type CloudflareChatResponse = {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
      refusal?: string | null;
    };
    finish_reason?: string | null;
  }>;
};

export function getCloudflareAiModel(): string {
  return process.env.CLOUDFLARE_AI_MODEL?.trim() || "@cf/zai-org/glm-4.7-flash";
}

function getCloudflareAiConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !token) {
    throw new Error("Cloudflare AI is not configured.");
  }
  const baseUrl =
    process.env.CLOUDFLARE_AI_BASE_URL?.trim().replace(/\/$/, "") ||
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
  const gatewayId = process.env.CLOUDFLARE_AI_GATEWAY_ID?.trim() || null;
  return { baseUrl, gatewayId, token };
}

export async function requestCloudflareChatCompletion(
  messages: CloudflareChatMessage[],
  options: CloudflareChatOptions = {},
): Promise<CloudflareChatResponse> {
  const { baseUrl, gatewayId, token } = getCloudflareAiConfig();
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(gatewayId ? { "cf-aig-gateway-id": gatewayId } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getCloudflareAiModel(),
      messages,
      response_format: options.response_format,
      temperature: options.temperature ?? 0.85,
      max_completion_tokens: options.max_completion_tokens ?? 1200,
      reasoning_effort: options.reasoning_effort ?? "low",
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 240);
    throw new Error(
      `Cloudflare AI request failed (${response.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  return (await response.json()) as CloudflareChatResponse;
}

export function getCloudflareChatContent(response: CloudflareChatResponse): string {
  const content = response.choices?.[0]?.message?.content?.trim();
  if (!content) {
    const finishReason = response.choices?.[0]?.finish_reason;
    throw new Error(
      `Cloudflare AI returned an empty response${finishReason ? ` (${finishReason})` : ""}.`,
    );
  }
  return content;
}
