import "server-only";

const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OPENROUTER_MODEL = "openrouter/free";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 1_000;

type OpenRouterErrorBody = {
  code?: number | string;
  message?: string;
};

type OpenRouterResponseBody = {
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: string | null;
    };
    error?: OpenRouterErrorBody;
  }>;
  error?: OpenRouterErrorBody;
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

/** Converts an OpenRouter error code to a safe HTTP-like status for app handling. */
function getErrorStatus(error: OpenRouterErrorBody | undefined, fallbackStatus: number) {
  const code = Number(error?.code);
  return Number.isInteger(code) && code >= 400 && code <= 599 ? code : fallbackStatus;
}

/** Returns whether a transient OpenRouter failure is safe to retry once. */
function isRetryableStatus(status: number) {
  return [408, 409, 429, 500, 502, 503, 504].includes(status);
}

/** Reads Retry-After while imposing a short upper bound for an interactive request. */
function getRetryDelay(response: Response) {
  const retryAfter = response.headers.get("retry-after");
  if (!retryAfter) return DEFAULT_RETRY_DELAY_MS;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) return Math.min(Math.max(seconds * 1_000, 0), 5_000);

  const retryAt = Date.parse(retryAfter);
  return Number.isNaN(retryAt) ? DEFAULT_RETRY_DELAY_MS : Math.min(Math.max(retryAt - Date.now(), 0), 5_000);
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** Calls OpenRouter with a free-only model and returns generated text. */
export async function createOpenRouterTextResponse(request: CreateOpenRouterTextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new OpenRouterConfigurationError("OPENROUTER_API_KEY is not configured.");

  const model = getFreeModel();
  let lastError: OpenRouterRequestError | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    let retryDelay = DEFAULT_RETRY_DELAY_MS;

    try {
      const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(siteUrl ? { "HTTP-Referer": siteUrl } : {}),
          "X-Title": "RentSpace Assistant",
        },
        body: JSON.stringify({
          model,
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
      const embeddedError = body.error ?? body.choices?.[0]?.error;

      if (!response.ok || embeddedError || body.choices?.[0]?.finish_reason === "error") {
        const status = getErrorStatus(embeddedError, response.ok ? 502 : response.status);
        lastError = new OpenRouterRequestError(
          embeddedError?.message ?? "OpenRouter returned an unsuccessful response.",
          status,
          requestId,
          embeddedError?.code === undefined ? null : String(embeddedError.code),
        );
        retryDelay = getRetryDelay(response);
      } else {
        const text = body.choices?.[0]?.message?.content?.trim();
        if (text) return text;
        lastError = new OpenRouterRequestError("OpenRouter returned no text output.", 502, requestId);
      }
    } catch (error) {
      if (error instanceof OpenRouterRequestError) {
        lastError = error;
      } else if (error instanceof Error && error.name === "AbortError") {
        lastError = new OpenRouterRequestError("OpenRouter request timed out.", 408, null);
      } else {
        lastError = new OpenRouterRequestError("Unable to reach OpenRouter.", 503, null);
      }
    } finally {
      clearTimeout(timeout);
    }

    if (!lastError || attempt === MAX_ATTEMPTS || !isRetryableStatus(lastError.status)) break;
    console.warn("OpenRouter free-model attempt failed; retrying:", {
      attempt,
      status: lastError.status,
      code: lastError.code,
      requestId: lastError.requestId,
    });
    await wait(retryDelay);
  }

  throw lastError ?? new OpenRouterRequestError("Unable to reach OpenRouter.", 503, null);
}
