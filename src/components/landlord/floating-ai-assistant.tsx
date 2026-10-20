"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useId, useRef, useState, useTransition } from "react";

import type { AssistantReply } from "@/app/actions/ai-assistant";

type FloatingMessage = {
  id: string;
  role: "assistant" | "user";
  body: string;
  relatedHref?: string;
  relatedLabel?: string;
  error?: boolean;
};

const quickPrompts = [
  "What should I prioritize today?",
  "How is rent collection performing?",
  "Which records need follow-up?",
];

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function requestReply(question: string, conversation: FloatingMessage[]) {
  const response = await fetch("/api/landlord/ai-assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      conversation: conversation.slice(-8).map((message) => ({ role: message.role, content: message.body })),
    }),
  });
  const reply = await response.json().catch(() => null) as AssistantReply | null;
  if (reply?.answer) return reply;
  throw new Error(`Assistant endpoint returned ${response.status}.`);
}

/** Provides a compact AI conversation from every AI-enabled landlord module. */
export function FloatingAiAssistant({ landlordName }: { landlordName: string }) {
  const pathname = usePathname();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<FloatingMessage[]>([
    { id: "welcome", role: "assistant", body: `Hi ${landlordName}. Ask me about your verified RentSpace analytics or operations.` },
  ]);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function submitQuestion(value: string) {
    const trimmed = value.trim();
    if (!trimmed || pending) return;
    const conversation = messages;
    setMessages((current) => [...current, { id: createId(), role: "user", body: trimmed }]);
    setQuestion("");

    startTransition(async () => {
      try {
        const reply = await requestReply(trimmed, conversation);
        setMessages((current) => [...current, { id: createId(), role: "assistant", body: reply.answer, relatedHref: reply.relatedHref, relatedLabel: reply.relatedLabel, error: reply.error }]);
      } catch (error) {
        console.error("Floating RentSpace Assistant request failed:", error);
        setMessages((current) => [...current, { id: createId(), role: "assistant", body: "I could not complete that request. Please try again or open the full assistant.", error: true }]);
      }
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitQuestion(question);
  }

  if (pathname === "/landlord/ai-assistant") return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <section role="dialog" aria-modal="false" aria-labelledby={titleId} className="flex h-[min(70vh,610px)] w-[calc(100vw-2rem)] max-w-[390px] flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_24px_70px_rgba(13,27,42,0.28)]">
          <header className="flex items-center justify-between gap-3 bg-[#294d4b] p-4 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f4cf58] text-sm font-black text-[#294d4b]">AI</span>
              <div className="min-w-0"><h2 id={titleId} className="truncate text-sm font-bold">RentSpace Assistant</h2><p className="text-[11px] text-[#dce8e5]">Verified data · Read-only</p></div>
            </div>
            <button type="button" aria-label="Close AI Assistant" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xl leading-none transition hover:bg-white/20">×</button>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f5f6f4] p-3" aria-live="polite">
            {messages.map((message) => {
              const outgoing = message.role === "user";
              return (
                <div key={message.id} className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${outgoing ? "rounded-br-md bg-[#1b263b] text-white" : `rounded-bl-md border bg-white text-[#0d1b2a] ${message.error ? "border-[#e8b7ab]" : "border-[var(--color-dormmate-border)]"}`}`}>
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    {message.relatedHref && message.relatedLabel ? <Link href={message.relatedHref} onClick={() => setOpen(false)} className="mt-2 inline-flex rounded-lg bg-[var(--color-dormmate-green-soft)] px-2.5 py-1.5 text-xs font-semibold text-[#1b263b]">{message.relatedLabel} →</Link> : null}
                  </div>
                </div>
              );
            })}
            {pending ? <div className="w-fit rounded-2xl rounded-bl-md border border-[var(--color-dormmate-border)] bg-white px-3.5 py-2.5 text-xs font-semibold text-[var(--color-dormmate-muted)]">AI is thinking…</div> : null}
            <div ref={bottomRef} />
          </div>

          {messages.length === 1 ? <div className="flex gap-2 overflow-x-auto border-t border-[var(--color-dormmate-border)] bg-white px-3 pt-3">{quickPrompts.map((prompt) => <button key={prompt} type="button" disabled={pending} onClick={() => submitQuestion(prompt)} className="min-w-max rounded-full border border-[#cbded9] bg-[#edf4f2] px-3 py-1.5 text-xs font-semibold text-[#294d4b] disabled:opacity-50">{prompt}</button>)}</div> : null}

          <form onSubmit={handleSubmit} className="border-t border-[var(--color-dormmate-border)] bg-white p-3">
            <div className="flex items-end gap-2">
              <textarea ref={inputRef} value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submitQuestion(question); } }} rows={1} maxLength={500} disabled={pending} aria-label="Ask the RentSpace Assistant" placeholder="Ask about your rentals..." className="max-h-28 min-h-11 flex-1 resize-none rounded-[14px] border border-[var(--color-dormmate-border)] bg-[#f8f8f6] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-dormmate-primary)] disabled:opacity-60" />
              <button type="submit" disabled={pending || !question.trim()} aria-label="Send message" className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[var(--color-dormmate-primary)] text-white transition hover:opacity-90 disabled:opacity-40"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 14-8-4 16-3-6-7-2Z" /><path strokeLinecap="round" d="m12 14 7-10" /></svg></button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3"><p className="text-[10px] text-[var(--color-dormmate-muted)]">Enter to send · Shift + Enter for a line</p><Link href="/landlord/ai-assistant" onClick={() => setOpen(false)} className="text-[11px] font-semibold text-[var(--color-dormmate-primary)] hover:underline">Open full assistant</Link></div>
          </form>
        </section>
      ) : null}

      <button type="button" aria-label={open ? "Close RentSpace AI Assistant" : "Open RentSpace AI Assistant"} aria-expanded={open} onClick={() => setOpen((current) => !current)} className="group relative grid h-14 w-14 place-items-center rounded-full bg-[#294d4b] text-white shadow-[0_12px_30px_rgba(13,27,42,0.35)] ring-4 ring-white/80 transition hover:-translate-y-1 hover:bg-[#315a57] sm:h-16 sm:w-16">
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-[#f4cf58]" aria-hidden="true" />
        {open ? <span aria-hidden="true" className="text-2xl leading-none">×</span> : <span className="text-base font-black tracking-tight sm:text-lg" aria-hidden="true">AI</span>}
      </button>
    </div>
  );
}