"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

type TermsPrivacyModalProps = {
  open: boolean;
  onClose: () => void;
};

export function TermsPrivacyModal({ open, onClose }: TermsPrivacyModalProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto px-4 py-6" role="presentation">
      <button
        type="button"
        aria-label="Close Terms of Service and Privacy Policy"
        onClick={onClose}
        className="fixed inset-0 bg-[#0d1b2a]/55 backdrop-blur-[2px]"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative my-auto flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_24px_70px_rgba(13,27,42,0.28)]"
      >
        <header className="flex items-start gap-4 border-b border-[var(--color-dormmate-border)] p-4 sm:p-6">
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--color-dormmate-border)] text-xl font-semibold leading-none text-[var(--color-dormmate-muted)] transition hover:bg-[var(--color-dormmate-surface)] hover:text-[var(--color-dormmate-text-strong)]"
          >
            ×
          </button>
          <div>
            <h2 id={titleId} className="text-xl font-bold tracking-tight text-[var(--color-dormmate-text-strong)] sm:text-2xl">
              Terms of Service and Privacy Policy
            </h2>
            <p className="mt-1 text-xs text-[var(--color-dormmate-muted)] sm:text-sm">Effective September 23, 2026</p>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto overscroll-contain p-5 text-sm leading-7 text-[var(--color-dormmate-muted)] sm:p-7">
          <section>
            <h3 className="text-lg font-bold text-[var(--color-dormmate-text-strong)]">Terms of Service</h3>
            <div className="mt-3 space-y-4">
              <p>
                By creating and using a RentSpace account, you agree to provide accurate registration information, keep your login credentials secure, and use the platform only for lawful rental-management activities.
              </p>
              <div>
                <h4 className="font-bold text-[#315a57]">Account registration and approval</h4>
                <p>
                  Registration does not guarantee access. Admin, landlord, and tenant accounts may remain pending until reviewed by the appropriate authorized user. RentSpace may reject, suspend, or deactivate accounts that contain false information, misuse the service, or violate these terms.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[#315a57]">Acceptable use</h4>
                <p>
                  You must not impersonate another person, access another user’s account, upload harmful or unlawful content, interfere with the platform, or use information obtained through RentSpace for unauthorized purposes.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[#315a57]">Rental and payment information</h4>
                <p>
                  RentSpace helps users record and manage rental information, assignments, maintenance requests, messages, and payment records. Users remain responsible for checking the accuracy of records and fulfilling obligations established in their separate rental agreements.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[#315a57]">Service availability</h4>
                <p>
                  The service may occasionally be unavailable because of maintenance, updates, network problems, or circumstances outside our control. Features may be changed when necessary to improve security or operation.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[#315a57]">Account responsibility</h4>
                <p>
                  You are responsible for activity performed through your account. Notify the property administrator promptly if you believe your account or personal information has been compromised.
                </p>
              </div>
            </div>
          </section>

          <section className="border-t border-[var(--color-dormmate-border)] pt-8">
            <h3 className="text-lg font-bold text-[var(--color-dormmate-text-strong)]">Privacy Policy</h3>
            <div className="mt-3 space-y-4">
              <div>
                <h4 className="font-bold text-[#315a57]">Information we collect</h4>
                <p>
                  RentSpace may collect your name, email address, mobile number, account role, profile photo, rental assignment details, maintenance requests, messages, payment-related records, and technical information needed to secure and operate the service.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[#315a57]">How information is used</h4>
                <p>
                  Information is used to create and verify accounts, manage properties and tenancies, process approval workflows, maintain rental records, support communication, respond to maintenance concerns, prevent misuse, and improve platform reliability.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[#315a57]">Who can access information</h4>
                <p>
                  Access depends on a user’s role and relationship to a property. Authorized administrators and landlords may view information needed to review accounts and manage rental operations. Tenants can access information relevant to their own account and rental.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[#315a57]">Storage and security</h4>
                <p>
                  Reasonable technical and organizational safeguards are used to protect information. No online system is completely risk-free, so users should use strong passwords and avoid sharing account credentials.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[#315a57]">Retention and requests</h4>
                <p>
                  Information may be retained while an account is active and as needed for legitimate rental, security, recordkeeping, or legal purposes. Users may contact the appropriate property administrator to request correction of inaccurate profile information or assistance with their account.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-[#315a57]">Policy updates</h4>
                <p>
                  These policies may be updated to reflect changes to RentSpace or applicable requirements. Material changes should be presented to users before continued use when renewed consent is appropriate.
                </p>
              </div>
            </div>
          </section>

          <p className="rounded-2xl bg-[var(--color-dormmate-surface)] p-4 text-xs leading-6">
            By checking the acceptance box on the registration form, you confirm that you have read and agree to these Terms of Service and acknowledge this Privacy Policy.
          </p>
        </div>
      </section>
    </div>,
    document.body,
  );
}