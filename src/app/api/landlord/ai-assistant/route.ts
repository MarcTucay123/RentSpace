import { askLandlordAssistant, type AssistantConversationMessage } from "@/app/actions/ai-assistant";

type AssistantRequestBody = {
  question?: unknown;
  conversation?: unknown;
};

function parseConversation(value: unknown): AssistantConversationMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is { role: "assistant" | "user"; content: string } => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as { role?: unknown; content?: unknown };
      return (candidate.role === "assistant" || candidate.role === "user") && typeof candidate.content === "string";
    })
    .slice(-8)
    .map((item) => ({ role: item.role, content: item.content.slice(0, 1_000) }));
}

/** Provides a stable JSON transport for the interactive landlord assistant. */
export async function POST(request: Request) {
  let body: AssistantRequestBody;

  try {
    body = await request.json() as AssistantRequestBody;
  } catch {
    return Response.json({ answer: "That message could not be read. Please try sending it again.", generatedAt: new Date().toISOString(), error: true }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question : "";

  try {
    const reply = await askLandlordAssistant(question, parseConversation(body.conversation));
    return Response.json(reply);
  } catch (error) {
    console.error("RentSpace Assistant API request failed before a reply was created:", error);
    return Response.json({
      answer: "Your RentSpace session or AI Assistant access may have changed. Refresh the page, sign in again if requested, then resend your message.",
      generatedAt: new Date().toISOString(),
      error: true,
      sessionError: true,
    }, { status: 401 });
  }
}