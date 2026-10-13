# RentSpace OpenAI API Integration

This folder is the external Large Language Model (LLM) integration for the RentSpace AI Assistant.

## Files

- `client.ts` — the low-level, server-only client that calls `POST https://api.openai.com/v1/responses`.
- `rentspace-assistant.ts` — the RentSpace assistant instructions, context format, and high-level generation function.
- `src/app/actions/ai-assistant.ts` — authorizes the Landlord, loads Supabase records protected by Row Level Security, removes unnecessary sensitive fields, and calls this integration.

## Environment variables

```env
OPENAI_API_KEY=your_server_only_openai_api_key
OPENAI_MODEL=gpt-5-mini
```

`OPENAI_API_KEY` must remain server-only. Never prefix it with `NEXT_PUBLIC_`, place it in browser code, or commit a real key to Git.

## Request flow

```text
Landlord AI Assistant page
  -> Next.js Server Action
  -> Landlord and feature authorization
  -> Supabase RLS-authorized operational queries
  -> Privacy-limited operational context
  -> src/lib/api/openai/rentspace-assistant.ts
  -> src/lib/api/openai/client.ts
  -> OpenAI Responses API
  -> Read-only answer returned to the chat UI
```

The model is not given database mutation tools. It can summarize information, provide advice, and draft text, but it cannot directly change RentSpace records or send messages.