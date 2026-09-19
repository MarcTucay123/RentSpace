"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";

type ProfileAvatarProps = {
  photoUrl: string | null | undefined;
  name: string;
  assignmentLabel?: string | null;
  assignmentPrefix?: string;
  className?: string;
};

export function ProfileAvatar({ photoUrl, name, assignmentLabel, assignmentPrefix = "Assigned to", className = "h-10 w-10" }: ProfileAvatarProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

  useEffect(() => {
    if (!previewOpen) return;

    const previousOverflow = document.body.style.overflow;
    const triggerElement = triggerRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleDialogKeyboard = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewOpen(false);
        return;
      }

      if (event.key === "Tab") {
        const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusableElements?.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener("keydown", handleDialogKeyboard);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleDialogKeyboard);
      triggerElement?.focus();
    };
  }, [previewOpen]);

  const openPreview = (event: MouseEvent<HTMLButtonElement>) => {
    if (!photoUrl) return;
    event.preventDefault();
    event.stopPropagation();
    setPreviewOpen(true);
  };

  const stopTriggerKeyPropagation = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.stopPropagation();
  };

  return (
    <>
      {photoUrl ? (
        <button
          ref={triggerRef}
          type="button"
          className={`relative inline-grid shrink-0 cursor-zoom-in overflow-hidden rounded-full bg-[var(--color-dormmate-green-soft)] text-sm font-bold text-[var(--color-dormmate-primary)] ring-2 ring-transparent transition hover:ring-[#d6a91f] focus-visible:ring-[#d6a91f] ${className}`}
          onClick={openPreview}
          onKeyDown={stopTriggerKeyPropagation}
          aria-label={`View ${name}'s profile photo`}
        >
          {/* Profile photo URLs are generated at runtime by the configured Supabase project. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt={`${name} profile`} className="h-full w-full object-cover" />
        </button>
      ) : (
        <span className={`relative inline-grid shrink-0 overflow-hidden rounded-full bg-[var(--color-dormmate-green-soft)] text-sm font-bold text-[var(--color-dormmate-primary)] ${className}`}>
          <span className="grid h-full w-full place-items-center" aria-hidden="true">{initials}</span>
        </span>
      )}

      {previewOpen && photoUrl ? createPortal(
        <div
          ref={dialogRef}
          className="fixed inset-0 z-[100] grid cursor-zoom-out place-items-center bg-[#0d1b2a]/85 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${name} profile photo preview`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewOpen(false);
          }}
        >
          <div className="relative z-10 flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-[1.5rem] border border-white/20 bg-[#203a38] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3 text-white sm:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e3bd42]">Profile photo</p>
                <p className="mt-0.5 truncate text-sm font-semibold sm:text-base">{name}</p>
                {assignmentLabel ? (
                  <p className="mt-1 text-xs leading-5 text-white/75">
                    <span className="font-semibold text-white/90">{assignmentPrefix}:</span> {assignmentLabel}
                  </p>
                ) : null}
              </div>
              <button ref={closeButtonRef} type="button" onClick={() => setPreviewOpen(false)} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white/12 px-3 text-sm font-semibold text-white transition hover:bg-white/20" aria-label="Exit profile photo preview">
                <span aria-hidden="true" className="text-xl leading-none">×</span>
                <span>Exit</span>
              </button>
            </div>
            <div className="grid min-h-0 flex-1 place-items-center overflow-auto bg-[#122321] p-3 sm:p-5">
              {/* Profile photo URLs are generated at runtime by the configured Supabase project. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt={`${name} full profile`} className="max-h-[calc(100dvh-9rem)] max-w-full rounded-xl object-contain shadow-2xl" />
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}