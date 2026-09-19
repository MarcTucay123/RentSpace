"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import type { Profile } from "@/lib/auth/types";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { PortalAutoRefresh } from "@/components/layout/portal-auto-refresh";

import { LogoutButton } from "./logout-button";

type NavItem = {
  href: string;
  label: string;
  badgeCount?: number;
};

type AppShellProps = {
  profile: Profile;
  profileAssignmentLabel?: string | null;
  title: string;
  subtitle: string;
  navItems: NavItem[];
  children: ReactNode;
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || (!href.endsWith("/dashboard") && pathname.startsWith(`${href}/`));
}

function NavigationLinks({
  navItems,
  pathname,
  onNavigate,
  dark = false,
}: {
  navItems: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  dark?: boolean;
}) {
  return (
    <nav aria-label="Portal navigation" className="grid gap-2">
      {navItems.map((item, index) => (
        <Link
          key={`${item.href}-${item.label}-${index}`}
          href={item.href}
          onClick={onNavigate}
          className={`group relative overflow-hidden rounded-[14px] px-4 py-2.5 text-sm font-medium transition ${
            isActivePath(pathname, item.href)
              ? dark
                ? "bg-white font-semibold text-[#294d4b] shadow-[0_10px_24px_rgba(13,27,42,0.2)]"
                : "bg-[#294d4b] font-semibold text-white shadow-[0_10px_24px_rgba(13,27,42,0.18)]"
              : dark
                ? "text-[#dce8e5] hover:translate-x-0.5 hover:bg-white/10 hover:text-white"
                : "text-[#415a77] hover:translate-x-0.5 hover:bg-[#e2ece9] hover:font-semibold hover:text-[#294d4b]"
          }`}
        >
          <span className="flex min-w-0 items-center justify-between gap-3">
            <span className="truncate">{item.label}</span>
            {item.badgeCount && item.badgeCount > 0 ? (
              <span
                className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#d6a91f] px-1.5 text-[10px] font-bold leading-none text-[#223b3a] shadow-sm"
                aria-label={`${item.badgeCount} pending`}
              >
                {item.badgeCount > 99 ? "99+" : item.badgeCount}
              </span>
            ) : null}
          </span>
        </Link>
      ))}
    </nav>
  );
}

function AccountSection({ profile, assignmentLabel, dark = false }: { profile: Profile; assignmentLabel?: string | null; dark?: boolean }) {
  const displayName = `${profile.first_name} ${profile.last_name}`.trim();
  const previewLabel = profile.role === "tenant" ? assignmentLabel ?? "No current assignment" : `${profile.role.charAt(0).toUpperCase()}${profile.role.slice(1)} account`;

  return (
    <>
      <div className={`mt-5 h-px ${dark ? "bg-white/15" : "bg-[#e0e1dd]"}`} />
      <div className={`mt-5 flex min-w-0 items-center gap-3 rounded-[16px] px-2 py-1 text-sm ${dark ? "text-[#b9ceca]" : "text-[#415a77]"}`}>
        <ProfileAvatar photoUrl={profile.profile_photo_url} name={displayName} assignmentLabel={previewLabel} assignmentPrefix={profile.role === "tenant" ? "Assigned to" : "Account"} className="h-11 w-11" />
        <div className="min-w-0">
          <div className={`truncate font-semibold ${dark ? "text-white" : "text-[#0d1b2a]"}`}>{displayName}</div>
          <div className="truncate">{profile.email ?? "No email set"}</div>
        </div>
      </div>
      <div className="mt-3">
        <LogoutButton dark={dark} />
      </div>
    </>
  );
}

export function AppShell({ profile, profileAssignmentLabel, title, subtitle, navItems, children }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const totalAttentionCount = navItems.reduce((total, item) => total + (item.badgeCount ?? 0), 0);

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const main = document.querySelector<HTMLElement>("[data-portal-main]");
    if (!main) return;
    const sections = Array.from(main.querySelectorAll<HTMLElement>(":scope > div > section, :scope > div > article, :scope > section, :scope > article"));
    if (sections.length === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sections.forEach((section) => { section.dataset.portalReveal = "visible"; });
      return;
    }

    sections.forEach((section, index) => {
      section.dataset.portalReveal = "ready";
      section.style.setProperty("--portal-reveal-delay", `${Math.min(index * 70, 280)}ms`);
    });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.portalReveal = "visible";
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -6%", threshold: 0.08 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <div className="portal-page min-h-screen px-3 py-3 text-[var(--color-dormmate-text)] sm:px-4 lg:px-[1cm]">
      <PortalAutoRefresh profileId={profile.id} />
      <header className="portal-topbar mb-4 flex min-h-[68px] items-center gap-3 rounded-[20px] px-3 py-3 sm:min-h-[74px] sm:px-4">
        <div className="shrink-0 rounded-[12px] border border-[#d8e5e2] bg-gradient-to-br from-white to-[#eef5f3] px-2 py-1.5 shadow-sm" aria-label="RentSpace product identity">
          <BrandLogo className="h-auto w-[112px] sm:w-[150px]" priority />
        </div>

        <div className="min-w-0 flex-1">
          <strong className="block truncate text-[0.95rem] font-bold text-[#0d1b2a] sm:text-[1.2rem]">{title}</strong>
          <small className="hidden truncate text-sm leading-5 text-[#415a77] sm:block">{subtitle}</small>
        </div>

        <div className="hidden rounded-full bg-[#f6e6a8] px-4 py-2 text-xs font-semibold capitalize text-[#755611] sm:block sm:text-sm">{profile.role}</div>
        <button
          type="button"
          aria-label={totalAttentionCount > 0 ? `Open navigation menu, ${totalAttentionCount} pending items` : "Open navigation menu"}
          aria-controls="mobile-portal-navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-[#cbded9] bg-[#edf4f2] text-[#294d4b] transition hover:border-[#315a57] lg:hidden"
        >
          <span className="sr-only">Open menu</span>
          <span aria-hidden="true" className="grid gap-1.5">
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
          </span>
          {totalAttentionCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-dormmate-primary)] px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
              {totalAttentionCount > 99 ? "99+" : totalAttentionCount}
            </span>
          ) : null}
        </button>
      </header>

      <div className="grid w-full gap-4 lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="portal-sidebar hidden rounded-[22px] p-4 lg:block lg:min-h-[560px]">
          <div className="mb-5 rounded-[16px] border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e3bd42]">Workspace</p>
            <p className="mt-1 text-sm font-semibold text-white">{title}</p>
          </div>
          <NavigationLinks navItems={navItems} pathname={pathname} dark />
          <AccountSection profile={profile} assignmentLabel={profileAssignmentLabel} dark />
        </aside>

        <main data-portal-main className="min-w-0">{children}</main>
      </div>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${menuOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          aria-label="Close navigation menu"
          tabIndex={menuOpen ? 0 : -1}
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 bg-[#0d1b2a]/45 backdrop-blur-[2px] transition-opacity duration-200 ${menuOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          id="mobile-portal-navigation"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} navigation`}
          className={`absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-[#294d4b] p-4 shadow-2xl transition-transform duration-200 ease-out ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/15 pb-4">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-white">{title}</p>
              <p className="mt-0.5 text-xs font-semibold capitalize text-[#e3bd42]">{profile.role} account</p>
            </div>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setMenuOpen(false)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-xl leading-none text-white"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            <NavigationLinks navItems={navItems} pathname={pathname} onNavigate={() => setMenuOpen(false)} dark />
            <AccountSection profile={profile} assignmentLabel={profileAssignmentLabel} dark />
          </div>
        </aside>
      </div>
    </div>
  );
}