import "server-only";

const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OPENROUTER_MODEL = "openrouter/free";
const REQUEST_TIMEOUT_MS = 30_000;

type OpenRouterResponseBody = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    code?: number | string;
    message?: string;
  };
};

export type CreateOpenRouterTextRequest = {
  instructions: string;
  input: string;
  maxOutputTokens?: number;
};

export class OpenRouterConfigurationError extends Error {}

export class OpenRouterRequestError extends Error {
  status: number;
  requestId: string | null;
  code: string | null;

  /** Creates an error containing only safe OpenRouter response metadata for server logs. */
  constructor(message: string, status: number, requestId: string | null, code: string | null = null) {
    super(message);
    this.name = "OpenRouterRequestError";
    this.status = status;
    this.requestId = requestId;
    this.code = code;
  }
}

/** Allows only OpenRouter's free router or explicitly free model variants. */
function getFreeModel() {
  const model = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;

  if (model !== DEFAULT_OPENROUTER_MODEL && !model.endsWith(":free")) {
    throw new OpenRouterConfigurationError("OPENROUTER_MODEL must use a free OpenRouter model.");
  }

  return model;
}

/** Calls OpenRouter with a free-only model and returns generated text. */
export async function createOpenRouterTextResponse(request: CreateOpenRouterTextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new OpenRouterConfigurationError("OPENROUTER_API_KEY is not configured.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(siteUrl ? { "HTTP-Referer": siteUrl } : {}),
        "X-Title": "RentSpace Assistant",
      },
      body: JSON.stringify({
        model: getFreeModel(),
        messages: [
          { role: "system", content: request.instructions },
          { role: "user", content: request.input },
        ],
        max_tokens: request.maxOutputTokens ?? 900,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({})) as OpenRouterResponseBody;
    const requestId = response.headers.get("x-request-id");

    if (!response.ok) {
      throw new OpenRouterRequestError(
        body.error?.message ?? "OpenRouter returned an unsuccessful response.",
        response.status,
        requestId,
        body.error?.code === undefined ? null : String(body.error.code),
      );
    }

    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) throw new OpenRouterRequestError("OpenRouter returned no text output.", response.status, requestId);

    return text;
  } catch (error) {
    if (error instanceof OpenRouterConfigurationError || error instanceof OpenRouterRequestError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new OpenRouterRequestError("OpenRouter request timed out.", 408, null);
    }
    throw new OpenRouterRequestError("Unable to reach OpenRouter.", 503, null);
  } finally {
    clearTimeout(timeout);
  }
}