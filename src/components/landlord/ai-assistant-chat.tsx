"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState, useTransition } from "react";

import { askLandlordAssistant, type AssistantReply } from "@/app/actions/ai-assistant";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  body: string;
  generatedAt: string;
  relatedHref?: string;
  relatedLabel?: string;
  error?: boolean;
};

type AiAssistantChatProps = {
  landlordName: string;
  prompts: string[];
  initialGeneratedAt: string;
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toAssistantMessage(reply: AssistantReply): ChatMessage {
  return { id: createId(), role: "assistant", body: reply.answer, ...reply };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function AiAssistantChat({ landlordName, prompts, initialGeneratedAt }: AiAssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      body: `Hi ${landlordName}. I can review your RentSpace records, recommend operational next steps, prioritize follow-ups, and draft messages for Tenant communication inside the system. I remain read-only and system-scoped. What would you like help with?`,
      generatedAt: initialGeneratedAt,
    },
  ]);
  const [question, setQuestion] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function submitQuestion(value: string) {
    const trimmed = value.trim();
    if (!trimmed || pending) return;
    const recentUserQuestions = messages.filter((message) => message.role === "user").slice(-3).map((message) => message.body);

    setMessages((current) => [...current, { id: createId(), role: "user", body: trimmed, generatedAt: new Date().toISOString() }]);
    setQuestion("");
    startTransition(async () => {
      try {
        const reply = await askLandlordAssistant(trimmed, recentUserQuestions);
        setMessages((current) => [...current, toAssistantMessage(reply)]);
      } catch {
        setMessages((current) => [...current, {
          id: createId(),
          role: "assistant",
          body: "I couldn’t complete that request. Check your connection and try again.",
          generatedAt: new Date().toISOString(),
          error: true,
        }]);
      }
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitQuestion(question);
  }

  function clearChat() {
    setMessages((current) => current.slice(0, 1));
    setQuestion("");
  }

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-dormmate-border)] bg-white shadow-[var(--shadow)] xl:h-[min(680px,calc(100dvh-7rem))] xl:min-h-[520px]">
      <div className="flex h-[min(600px,calc(100dvh-8rem))] min-h-[480px] min-w-0 flex-col xl:h-full xl:min-h-0">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-dormmate-border)] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-dormmate-primary)] text-sm font-bold text-white">AI</span>
            <div className="min-w-0">
              <h2 className="truncate font-bold text-[#0d1b2a]">RentSpace Assistant</h2>
              <p className="text-xs text-[var(--color-dormmate-muted)]">System-scoped advice and communication guidance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-[#f0f1ee] px-2.5 py-1 text-[10px] font-semibold text-[#1b263b] sm:inline-flex">Online</span>
            <button type="button" onClick={clearChat} disabled={messages.length === 1 || pending} className="text-xs font-semibold text-[var(--color-dormmate-primary)] hover:underline disabled:cursor-not-allowed disabled:opacity-40">Clear chat</button>
          </div>
        </header>

        <div aria-live="polite" aria-busy={pending} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-[#f8f8f6] p-4 sm:p-5">
          {messages.map((message) => {
            const outgoing = message.role === "user";
            return (
              <article key={message.id} className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-[18px] px-4 py-3 sm:max-w-[76%] ${outgoing ? "rounded-br-md bg-[#1b263b] text-white" : `rounded-bl-md border bg-white text-[#0d1b2a] ${message.error ? "border-[#e8b7ab]" : "border-[var(--color-dormmate-border)]"}`}`}>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
                  {message.relatedHref && message.relatedLabel ? (
                    <Link href={message.relatedHref} className="mt-3 inline-flex rounded-[11px] bg-[var(--color-dormmate-green-soft)] px-3 py-2 text-xs font-semibold text-[#1b263b] transition hover:bg-[#e0e1dd]">
                      {message.relatedLabel} →
                    </Link>
                  ) : null}
                  <p className={`mt-1.5 text-[10px] ${outgoing ? "text-white/70" : "text-[#415a77]"}`}>{formatTime(message.generatedAt)}</p>
                </div>
              </article>
            );
          })}
          {pending ? (
            <div className="flex justify-start">
              <div className="rounded-[18px] rounded-bl-md border border-[var(--color-dormmate-border)] bg-white px-4 py-3 text-sm text-[var(--color-dormmate-muted)]">
                <span className="inline-flex items-center gap-1" aria-label="Assistant is analyzing your data">
                  Analyzing your data<span className="animate-pulse">…</span>
                </span>
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t border-[var(--color-dormmate-border)] p-3 sm:p-4">
          <div className="mb-3 rounded-[14px] bg-[#f5f6f4] p-3">
            <button type="button" aria-expanded={suggestionsOpen} aria-controls="ai-suggested-questions" onClick={() => setSuggestionsOpen((current) => !current)} className="flex w-full items-center justify-between gap-3 text-left text-xs font-semibold text-[var(--color-dormmate-primary)]">
              <span>{suggestionsOpen ? "Hide suggested questions" : "Show suggested questions"}</span>
              <span aria-hidden="true" className={`text-base transition-transform ${suggestionsOpen ? "rotate-180" : ""}`}>⌄</span>
            </button>
            {suggestionsOpen ? (
              <div id="ai-suggested-questions" className="mt-2">
                <p className="text-xs text-[var(--color-dormmate-muted)]">Select a question to send it instantly, or type your own message below.</p>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {prompts.map((prompt) => (
                    <button key={prompt} type="button" disabled={pending} onClick={() => submitQuestion(prompt)} className="min-w-[220px] rounded-[12px] border border-[var(--color-dormmate-border)] bg-white px-3 py-2 text-left text-xs font-medium leading-5 text-[#1b263b] transition hover:border-[var(--color-dormmate-primary)] hover:bg-[var(--color-dormmate-green-soft)] disabled:opacity-60">
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitQuestion(question);
                }
              }}
              required
              maxLength={500}
              rows={2}
              disabled={pending}
              aria-label="Ask the RentSpace Assistant"
              placeholder="Ask for RentSpace information, advice, priorities, or a Tenant message draft..."
              className="min-h-[50px] flex-1 resize-none rounded-[16px] border border-[var(--color-dormmate-border)] bg-[#f8f8f6] px-4 py-3 text-sm outline-none focus:border-[var(--color-dormmate-primary)] focus:ring-2 focus:ring-[var(--color-dormmate-primary-soft)] disabled:opacity-60"
            />
            <button type="submit" disabled={pending || !question.trim()} className="rounded-[14px] bg-[var(--color-dormmate-primary)] px-4 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
              {pending ? "Thinking..." : "Ask"}
            </button>
          </div>
          <p className="mt-2 px-1 text-[10px] text-[var(--color-dormmate-muted)]">Enter to send • Shift + Enter for a new line • System scope only • Review advice and message drafts before acting</p>
        </form>
      </div>
    </section>
  );
}