import type { Metadata } from "next";
import Link from "next/link";

import { ScrollReveal } from "@/components/marketing/scroll-reveal";

export const metadata: Metadata = {
  title: "RentSpace | Dormitory and Apartment Management",
  description: "A calm, role-based workspace for managing Lady D's Dormitory and Apartment.",
};

const capabilities = [
  ["01", "Tenant records", "Keep approved accounts, assignments, room details, and occupancy history organized."],
  ["02", "Rent monitoring", "Follow monthly obligations, due dates, payment proofs, balances, and billing history."],
  ["03", "Maintenance", "Receive documented concerns and keep every request moving toward resolution."],
  ["04", "Clear reporting", "Review rental, payment, occupancy, and maintenance information by role."],
  ["05", "Account control", "Manage approvals, account access, profiles, and protected administration."],
  ["06", "Rental assistant", "Ask supported operational questions without changing rental or payment records."],
];

const workflow = [
  ["1", "Account review", "The responsible administrator or landlord reviews each registration."],
  ["2", "Rental assignment", "Approved tenants are assigned to an available apartment, room, or bed space."],
  ["3", "Monthly monitoring", "Rent obligations and payments stay organized by billing period."],
  ["4", "Service coordination", "Notices, messages, and maintenance requests support the tenancy."],
];

function TrendIcon() {
  return (
    <svg viewBox="0 0 64 40" aria-hidden="true" className="h-10 w-16">
      <path d="M4 33 20 20l11 7L57 5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M47 5h10v10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PortalPreview() {
  const bars = [48, 68, 54, 82, 61, 73];

  return (
    <div className="landing-preview" aria-label="RentSpace portal preview">
      <aside className="landing-preview-sidebar">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d6a91f] font-black text-[#294d4b]">R</span>
          <strong className="text-sm tracking-tight">RentSpace</strong>
        </div>
        <div className="mt-9 space-y-3">
          {["Overview", "Tenants", "Payments", "Maintenance"].map((item, index) => (
            <div key={item} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[10px] font-semibold ${index === 0 ? "bg-white/12 text-white" : "text-white/65"}`}>
              <span className={`h-2 w-2 rounded-full ${index === 0 ? "bg-[#d6a91f]" : "bg-white/35"}`} />{item}
            </div>
          ))}
        </div>
        <div className="mt-auto rounded-2xl bg-white/8 p-3 text-[#dce9e7]"><TrendIcon /><p className="mt-2 text-[10px] font-semibold">Everything in one calm workspace.</p></div>
      </aside>
      <div className="min-w-0 flex-1 bg-[#f7f8f4] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#6c8582]">Overview</p><p className="mt-1 text-base font-bold text-[#253d3b]">Good morning</p></div>
          <span className="h-9 w-9 rounded-full border-4 border-white bg-[#d6a91f] shadow-sm" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[["Occupied", "24"], ["Due this month", "₱48K"], ["Open requests", "06"]].map(([label, value], index) => (
            <div key={label} className={`rounded-2xl p-3 ${index === 0 ? "bg-[#315a57] text-white" : "bg-white text-[#294d4b]"}`}>
              <p className={`text-[8px] ${index === 0 ? "text-white/60" : "text-[#718783]"}`}>{label}</p><p className="mt-2 text-lg font-bold">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl bg-white p-3.5">
            <div className="flex items-center justify-between"><p className="text-[10px] font-bold text-[#294d4b]">Monthly collections</p><span className="text-[9px] text-[#78908c]">2026</span></div>
            <div className="mt-4 flex h-24 items-end justify-between gap-2 border-b border-[#e1ebe8] px-1">
              {bars.map((height, index) => <span key={index} className={`w-full rounded-t-md ${index === 3 ? "bg-[#d6a91f]" : "bg-[#77918d]"}`} style={{ height: `${height}%` }} />)}
            </div>
          </div>
          <div className="rounded-2xl bg-[#e8f1ef] p-3.5">
            <p className="text-[10px] font-bold text-[#294d4b]">Occupancy</p>
            <div className="mx-auto mt-3 grid h-20 w-20 place-items-center rounded-full bg-[conic-gradient(#315a57_0_82%,#c9dad6_82%)]"><div className="grid h-14 w-14 place-items-center rounded-full bg-[#e8f1ef] text-sm font-bold text-[#294d4b]">82%</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="landing-page min-h-screen text-[var(--color-dormmate-text)]">
      <header className="landing-header sticky top-0 z-30">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" aria-label="RentSpace home" className="shrink-0"><div className="text-2xl font-black leading-none tracking-[-0.05em] text-[#294d4b]">Rent<span className="text-[#d6a91f]">Space</span></div><div className="mt-1 text-[10px] font-bold uppercase leading-4 tracking-[0.1em] text-[#587572]">Lady D&apos;s Dormitory and Apartment</div></Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-semibold text-[#587572] lg:flex"><a href="#overview" className="transition hover:text-[#294d4b]">Overview</a><a href="#capabilities" className="transition hover:text-[#294d4b]">Capabilities</a><a href="#workflow" className="transition hover:text-[#294d4b]">How it works</a></nav>
          <Link href="/login" className="brand-button rounded-xl px-4 py-2.5 text-sm font-semibold text-white sm:px-5">Sign In</Link>
        </div>
      </header>

      <main>
        <section id="overview" className="landing-hero overflow-hidden">
          <div className="mx-auto grid max-w-[1280px] gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:px-8 lg:py-24">
            <ScrollReveal><p className="eyebrow-pill text-xs font-bold uppercase tracking-[0.18em] text-[#315a57]">Rental management, made clear</p><h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.03] tracking-[-0.05em] text-[#253d3b] sm:text-5xl lg:text-[4.25rem]">A calmer way to run your <span className="text-[#b78a12]">rental community.</span></h1><p className="mt-6 max-w-xl text-base leading-8 text-[#587572] sm:text-lg">Manage tenants, spaces, rent, payments, maintenance, and reports from one thoughtful workspace built for Lady D&apos;s Dormitory and Apartment.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/login" className="brand-button inline-flex items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-semibold text-white">Access your portal <span className="ml-2">→</span></Link><Link href="/register" className="secondary-button inline-flex items-center justify-center rounded-2xl border border-[#bfd0cc] bg-white/80 px-6 py-3.5 text-sm font-semibold text-[#315a57]">Request an account</Link></div><div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-[#6c8582]"><span>✓ Role-based access</span><span>✓ Approval workflows</span><span>✓ Protected records</span></div></ScrollReveal>
            <ScrollReveal delay={140}><PortalPreview /></ScrollReveal>
          </div>
        </section>

        <section id="capabilities" className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <ScrollReveal className="max-w-2xl"><p className="section-kicker">Everything stays connected</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[#253d3b] sm:text-4xl">The daily work of rental management, in one place.</h2><p className="mt-4 leading-7 text-[#587572]">Each role sees the tools and information needed to move work forward without unnecessary complexity.</p></ScrollReveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{capabilities.map(([number, title, body], index) => <ScrollReveal key={number} delay={(index % 3) * 80}><article className="landing-card interactive-card h-full p-6"><div className="flex items-center justify-between"><span className="text-xs font-bold tracking-[0.18em] text-[#8ca39f]">{number}</span><span className="h-2.5 w-2.5 rounded-full bg-[#d6a91f]" /></div><h3 className="mt-8 text-lg font-bold text-[#294d4b]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#607b77]">{body}</p></article></ScrollReveal>)}</div>
        </section>

        <section id="workflow" className="bg-[#dce9e7]">
          <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:px-8 lg:py-24">
            <ScrollReveal><p className="section-kicker">A guided workflow</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[#253d3b] sm:text-4xl">From registration to monthly management.</h2><p className="mt-4 leading-7 text-[#587572]">Clear steps make responsibilities visible and records easier to trust.</p><div className="mt-8 hidden h-36 w-36 rounded-[2.5rem] bg-[#315a57] p-6 text-[#d6a91f] shadow-[0_22px_50px_rgba(41,77,75,0.2)] lg:block"><TrendIcon /><p className="mt-4 text-sm font-semibold text-white">Simple steps.<br />Better visibility.</p></div></ScrollReveal>
            <ol className="grid gap-4 sm:grid-cols-2">{workflow.map(([number, title, body], index) => <ScrollReveal key={number} delay={(index % 2) * 90}><li className="landing-card h-full p-5"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#315a57] text-sm font-bold text-[#f4cf58]">{number}</span><h3 className="mt-5 font-bold text-[#294d4b]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#607b77]">{body}</p></li></ScrollReveal>)}</ol>
          </div>
        </section>

        <section id="access" className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24"><ScrollReveal><div className="landing-cta overflow-hidden rounded-[2rem] px-6 py-10 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f4cf58]">Your workspace is ready</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Access RentSpace with your approved account.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-[#dce9e7]">Choose your assigned portal, or submit a landlord or tenant registration for approval.</p></div><div className="mt-7 flex flex-col gap-3 sm:flex-row lg:mt-0"><Link href="/login" className="secondary-button rounded-2xl bg-white px-6 py-3 text-center text-sm font-semibold text-[#294d4b]">Sign In</Link><Link href="/register" className="secondary-button rounded-2xl border border-white/25 bg-white/8 px-6 py-3 text-center text-sm font-semibold text-white">Register</Link></div></div></ScrollReveal></section>
      </main>

      <footer className="border-t border-[#cbdad7] bg-[#f6f7f3]"><div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-4 py-7 text-xs text-[#607b77] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><p className="font-bold text-[#294d4b]">RentSpace · Lady D&apos;s Dormitory and Apartment</p><p>Role-based dormitory, apartment, and tenant management.</p></div></footer>
    </div>
  );
}