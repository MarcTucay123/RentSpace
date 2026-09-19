import Link from "next/link";

type LandlordModulePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function LandlordModulePlaceholder({
  eyebrow,
  title,
  description,
  primaryHref = "/landlord/dashboard",
  primaryLabel = "Back to dashboard",
  secondaryHref = "/landlord/units",
  secondaryLabel = "Open units",
}: LandlordModulePlaceholderProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">{eyebrow}</p>
        <h2 className="mt-2 text-[1.55rem] font-semibold tracking-tight sm:text-[1.8rem]">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-dormmate-muted)]">{description}</p>
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="rounded-[1.35rem] bg-white p-4 shadow-[var(--shadow)] sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-dormmate-primary)]">Workspace status</p>
          <h3 className="mt-2 text-[1.35rem] font-semibold text-[var(--color-dormmate-text-strong)]">Module route is now available</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-dormmate-muted)]">
            This page is now a dedicated landlord route. You can continue the visual refinement first, then plug in live Supabase-backed data and actions afterward.
          </p>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              href={primaryHref}
              className="inline-flex rounded-[14px] bg-[var(--color-dormmate-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              {primaryLabel}
            </Link>
            <Link
              href={secondaryHref}
              className="inline-flex rounded-[14px] border border-[var(--color-dormmate-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-dormmate-text-strong)] transition hover:bg-[var(--color-dormmate-green-soft)]"
            >
              {secondaryLabel}
            </Link>
          </div>
        </div>

        <div className="rounded-[1.35rem] bg-[#fff8e7] p-4 shadow-[var(--shadow)] sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c08a26]">Next implementation step</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-dormmate-muted)]">
            <li>• Connect the page to landlord-approved data queries.</li>
            <li>• Add action buttons and forms only after the data contract is finalized.</li>
            <li>• Keep sizing compact for 1366×768 laptop screens.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}