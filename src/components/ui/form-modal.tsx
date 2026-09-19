"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type FormModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
};

export function FormModal({ open, title, description, children, onClose }: FormModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto px-4 py-6" role="presentation">
      <button type="button" aria-label={`Close ${title}`} onClick={onClose} className="fixed inset-0 bg-[#0d1b2a]/50 backdrop-blur-[2px]" />
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative my-auto w-full max-w-3xl overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_24px_70px_rgba(13,27,42,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-dormmate-border)] p-5 sm:p-6">
          <div>
            <h2 id={titleId} className="text-xl font-bold tracking-tight text-[var(--color-dormmate-text-strong)]">{title}</h2>
            {description ? <p className="mt-1 text-sm text-[var(--color-dormmate-muted)]">{description}</p> : null}
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="rounded-[12px] border border-[var(--color-dormmate-border)] px-3 py-2 text-sm font-semibold text-[var(--color-dormmate-muted)] hover:bg-[var(--color-dormmate-surface)]">Cancel</button>
        </div>
        <div className="max-h-[75vh] overflow-x-hidden overflow-y-auto p-4 sm:p-5">{children}</div>
      </section>
    </div>
  );
}