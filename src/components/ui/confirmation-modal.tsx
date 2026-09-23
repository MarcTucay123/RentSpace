"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type ConfirmationModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "positive" | "danger";
  pending?: boolean;
  hideCancel?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmationModal({
  open,
  title,
  description,
  confirmLabel,
  tone = "positive",
  pending = false,
  hideCancel = false,
  onCancel,
  onConfirm,
}: ConfirmationModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (hideCancel) confirmButtonRef.current?.focus();
    else cancelButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending && !hideCancel) onCancel();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hideCancel, onCancel, open, pending]);

  if (!open || typeof document === "undefined") return null;

  const isDanger = tone === "danger";

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain" role="presentation">
      <button
        type="button"
        aria-label="Close confirmation dialog"
        disabled={pending || hideCancel}
        onClick={onCancel}
        className="fixed inset-0 bg-[#0d1b2a]/50 backdrop-blur-[2px] disabled:cursor-wait"
      />

      <div className="relative z-10 flex min-h-full items-center justify-center p-4 sm:p-6">
        <section
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirmation-modal-title"
          aria-describedby="confirmation-modal-description"
          className="w-full max-w-[440px] overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_24px_70px_rgba(13,27,42,0.24)]"
        >
          <div className={`h-1.5 w-full ${isDanger ? "bg-[#cf6a4b]" : "bg-[var(--color-dormmate-primary)]"}`} />
          <div className="p-5 sm:p-6">
            <div className={`grid h-12 w-12 place-items-center rounded-full text-xl font-bold ${isDanger ? "bg-[#fbe9e5] text-[#b9573b]" : "bg-[var(--color-dormmate-green-soft)] text-[#1b263b]"}`} aria-hidden="true">
              {isDanger ? "!" : "✓"}
            </div>

            <h2 id="confirmation-modal-title" className="mt-4 text-xl font-bold tracking-tight text-[var(--color-dormmate-text-strong)] sm:text-[1.4rem]">
              {title}
            </h2>
            <p id="confirmation-modal-description" className="mt-2 text-sm leading-6 text-[var(--color-dormmate-muted)]">
              {description}
            </p>

            <div className={`mt-6 grid gap-3 ${hideCancel ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
              {!hideCancel ? (
                <button
                  ref={cancelButtonRef}
                  type="button"
                  disabled={pending}
                  onClick={onCancel}
                  className="rounded-[14px] border border-[var(--color-dormmate-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[#415a77] transition hover:bg-[var(--color-dormmate-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              ) : null}
              <button
                ref={confirmButtonRef}
                type="button"
                disabled={pending}
                onClick={onConfirm}
                className={`rounded-[14px] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${isDanger ? "bg-[#c65f43]" : "bg-[var(--color-dormmate-primary)]"}`}
              >
                {pending ? "Please wait..." : confirmLabel}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}