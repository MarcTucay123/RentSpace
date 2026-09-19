import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  footer?: ReactNode;
  children: ReactNode;
  compactCard?: boolean;
  hideCardDescription?: boolean;
  formOnly?: boolean;
  narrowForm?: boolean;
};

function AuthArtwork() {
  return (
    <div className="auth-artwork" aria-hidden="true">
      <div className="auth-artwork-orbit auth-artwork-orbit-one" />
      <div className="auth-artwork-orbit auth-artwork-orbit-two" />
      <div className="auth-building">
        <div className="auth-building-roof" />
        <div className="auth-building-face">
          <div className="grid grid-cols-3 gap-2 px-5 pt-6">
            {Array.from({ length: 6 }).map((_, index) => <span key={index} className={`h-7 rounded-md ${index === 4 ? "bg-[#f4cf58]" : "bg-[#d7e8e5]"}`} />)}
          </div>
          <div className="mx-auto mt-5 h-14 w-12 rounded-t-xl bg-[#315a57]" />
        </div>
      </div>
      <div className="auth-artwork-card auth-artwork-card-left"><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b8581]">Occupancy</span><strong className="mt-2 block text-2xl text-[#294d4b]">82%</strong><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#d9e6e3]"><span className="block h-full w-4/5 rounded-full bg-[#d6a91f]" /></span></div>
      <div className="auth-artwork-card auth-artwork-card-right"><span className="block h-2 w-2 rounded-full bg-[#d6a91f]" /><strong className="mt-2 block text-sm text-[#294d4b]">Records updated</strong><span className="mt-1 block text-[10px] text-[#6b8581]">Your workspace stays organized.</span></div>
    </div>
  );
}

export function AuthShell({ eyebrow, title, description, footer, children, compactCard = false, hideCardDescription = false, formOnly = false, narrowForm = false }: AuthShellProps) {
  return (
    <div className="auth-page min-h-screen px-3 py-3 text-[var(--color-dormmate-text)] sm:px-5 sm:py-5">
      <div className={`auth-frame mx-auto overflow-hidden ${formOnly && narrowForm ? "max-w-[1120px]" : "max-w-[1280px]"}`}>
        <div className={`grid min-h-[calc(100vh-1.5rem)] ${formOnly ? "lg:grid-cols-[minmax(360px,0.9fr)_minmax(460px,1.1fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.8fr)]"}`}>
          <section className="auth-intro relative flex min-h-[250px] flex-col overflow-hidden p-6 sm:min-h-[300px] sm:p-9 lg:min-h-full lg:p-12">
            <Link href="/" aria-label="RentSpace home" className="relative z-10 inline-flex w-fit rounded-2xl bg-white/55 px-3 py-2 shadow-sm backdrop-blur-sm">
              <BrandLogo className="h-auto w-[190px] sm:w-[230px]" priority />
            </Link>

            <div className="relative z-10 mt-7 max-w-[560px] sm:mt-10 lg:mt-16">
              <p className="section-kicker">{eyebrow}</p>
              <h1 className="mt-3 text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#253d3b] sm:mt-4 sm:text-4xl lg:text-5xl">{title}</h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-[#587572] sm:mt-5 sm:text-base sm:leading-7">{description}</p>
            </div>

            <div className="relative z-10 mt-[2cm] hidden lg:block"><AuthArtwork /></div>
          </section>

          <section className="auth-form-area flex items-center justify-center p-4 sm:p-7 lg:p-10">
            <div className={`auth-form-card w-full ${formOnly && !narrowForm ? "max-w-[760px]" : "max-w-[500px]"} ${compactCard ? "p-5 sm:p-7" : "p-5 sm:p-8"}`}>
              <div className="mb-6 flex items-start justify-between gap-4 border-b border-[#dce7e4] pb-5">
                <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b78a12]">Secure access</p>{hideCardDescription ? null : <p className="mt-2 text-sm leading-6 text-[#607b77]">Use your approved account details below.</p>}</div>
                <Link href="/" className="shrink-0 rounded-xl border border-[#d5e2df] bg-white px-3 py-2 text-xs font-bold text-[#315a57] transition hover:border-[#94ada8]">Back home</Link>
              </div>
              {children}
              {footer ? <div className="mt-6 text-center text-sm text-[#607b77]">{footer}</div> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}