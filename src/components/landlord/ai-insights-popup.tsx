"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const SESSION_STORAGE_KEY = "rentspace-dashboard-ai-insights-viewed";

type AiInsightsPopupProps = {
  insights: string | null;
  generatedAt: string;
};

/** Presents the server-generated portfolio briefing in a dismissible dashboard dialog. */
export function AiInsightsPopup({ insights, generatedAt }: AiInsightsPopupProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!insights || window.sessionStorage.getItem(SESSION_STORAGE_KEY)) return;

    window.sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
    const frame = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, [insights]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, open]);

  const generatedLabel = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date(generatedAt));

  return (
    <>
      <section className="rounded-[1.35rem] border border-[#cbd9d5] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-dormmate-green-soft)] text-lg font-bold text-[var(--color-dormmate-primary)]" aria-hidden="true">AI</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-dormmate-primary)]">AI insights</p>
              <h2 className="mt-1 text-lg font-bold text-[var(--color-dormmate-text-strong)]">{insights ? "Your portfolio briefing is ready" : "AI insights are currently unavailable"}</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--color-dormmate-muted)]">
                {insights ? "Generated from aggregate verified metrics without tenant identities." : "Live AI insights could not be loaded; verified dashboard metrics remain available."}
              </p>
            </div>
          </div>
          <button
            ref={triggerButtonRef}
            type="button"
            disabled={!insights}
            onClick={() => setOpen(true)}
            className="rounded-xl bg-[var(--color-dormmate-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {insights ? "View AI Insights" : "Insights unavailable"}
          </button>
        </div>
      </section>

      {open && insights && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[110] overflow-y-auto overscroll-contain" role="presentation">
              <button type="button" aria-label="Close AI insights" onClick={close} className="fixed inset-0 bg-[#0d1b2a]/55 backdrop-blur-[3px]" />
              <div className="relative z-10 flex min-h-full items-center justify-center p-4 sm:p-6">
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={titleId}
                  aria-describedby={descriptionId}
                  className="w-full max-w-2xl overflow-hidden rounded-[26px] border border-white/70 bg-white shadow-[0_28px_80px_rgba(13,27,42,0.3)]"
                >
                  <div className="h-1.5 bg-[var(--color-dormmate-primary)]" />
                  <header className="flex items-start justify-between gap-4 border-b border-[var(--color-dormmate-border)] p-5 sm:p-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[var(--color-dormmate-green-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-dormmate-primary)]">AI insight</span>
                        <span className="rounded-full bg-[#f0f1ee] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#415a77]">Verified inputs</span>
                      </div>
                      <h2 id={titleId} className="mt-3 text-xl font-bold tracking-tight text-[var(--color-dormmate-text-strong)] sm:text-2xl">Portfolio briefing</h2>
                      <p id={descriptionId} className="mt-1 text-xs leading-5 text-[var(--color-dormmate-muted)]">Generated {generatedLabel} from aggregate rental analytics. Review recommendations before acting.</p>
                    </div>
                    <button ref={closeButtonRef} type="button" aria-label="Close AI insights" onClick={close} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--color-dormmate-border)] text-xl font-semibold leading-none text-[var(--color-dormmate-muted)] transition hover:bg-[var(--color-dormmate-surface)] hover:text-[var(--color-dormmate-text-strong)]">×</button>
                  </header>

                  <div className="max-h-[62vh] overflow-y-auto overscroll-contain p-5 sm:p-6">
                    <div className="whitespace-pre-line rounded-2xl bg-[#f5f8f7] p-4 text-sm leading-7 text-[var(--color-dormmate-text)] sm:p-5">{insights}</div>
                    <p className="mt-4 text-xs leading-5 text-[var(--color-dormmate-muted)]">This briefing is read-only and does not change tenant, payment, maintenance, or rental records.</p>
                  </div>

                  <footer className="flex flex-col-reverse gap-3 border-t border-[var(--color-dormmate-border)] bg-[#fbfcfb] p-4 sm:flex-row sm:justify-end sm:p-5">
                    <button type="button" onClick={close} className="rounded-xl border border-[var(--color-dormmate-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[#415a77] transition hover:bg-[var(--color-dormmate-surface)]">Close</button>
                    <Link href="/landlord/ai-assistant" onClick={close} className="rounded-xl bg-[var(--color-dormmate-primary)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90">Ask a follow-up</Link>
                  </footer>
                </section>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}