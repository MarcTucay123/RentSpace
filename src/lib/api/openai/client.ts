import "server-only";

import { createHash } from "node:crypto";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
const REQUEST_TIMEOUT_MS = 30_000;

type OpenAIOutputPart = {
  type?: string;
  text?: string;
};

type OpenAIResponseBody = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: OpenAIOutputPart[];
  }>;
  error?: {
    message?: string;
    code?: string | null;
    type?: string;
  };
};

export type CreateOpenAITextRequest = {
  instructions: string;
  input: string;
  safetyIdentifier: string;
  maxOutputTokens?: number;
};

export class OpenAIConfigurationError extends Error {}

export class OpenAIRequestError extends Error {
  status: number;
  requestId: string | null;
  code: string | null;

  /** Creates an error containing only safe OpenAI response metadata for server logs. */
  constructor(message: string, status: number, requestId: string | null, code: string | null = null) {
    super(message);
    this.name = "OpenAIRequestError";
    this.status = status;
    this.requestId = requestId;
    this.code = code;
  }
}

/** Converts a local profile identifier into a one-way stable safety identifier. */
function hashSafetyIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** Extracts all final text parts without assuming a fixed Responses API output position. */
function extractResponseText(body: OpenAIResponseBody) {
  if (body.output_text?.trim()) return body.output_text.trim();

  return (body.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text" && typeof part.text === "string")
    .map((part) => part.text?.trim())
    .filter((text): text is string => Boolean(text))
    .join("\n")
    .trim();
}

/** Calls the OpenAI Responses API from the server and returns the generated text. */
export async function createOpenAITextResponse(request: CreateOpenAITextRequest) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;

  if (!apiKey) throw new OpenAIConfigurationError("OPENAI_API_KEY is not configured.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: request.instructions,
        input: request.input,
        max_output_tokens: request.maxOutputTokens ?? 900,
        safety_identifier: hashSafetyIdentifier(request.safetyIdentifier),
        store: false,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({})) as OpenAIResponseBody;
    const requestId = response.headers.get("x-request-id");

    if (!response.ok) {
      throw new OpenAIRequestError(
        body.error?.message ?? "OpenAI returned an unsuccessful response.",
        response.status,
        requestId,
        body.error?.code ?? body.error?.type ?? null,
      );
    }

    const text = extractResponseText(body);
    if (!text) throw new OpenAIRequestError("OpenAI returned no text output.", response.status, requestId);

    return text;
  } catch (error) {
    if (error instanceof OpenAIRequestError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new OpenAIRequestError("OpenAI request timed out.", 408, null);
    }
    throw new OpenAIRequestError("Unable to reach OpenAI.", 503, null);
  } finally {
    clearTimeout(timeout);
  }
}