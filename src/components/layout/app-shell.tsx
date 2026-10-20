"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import type { Profile } from "@/lib/auth/types";
import { BrandLogo } from "@/components/brand/brand-logo";
import { PortalAutoRefresh } from "@/components/layout/portal-auto-refresh";

import { LogoutButton } from "./logout-button";

type NavItem = {
  href: string;
  label: string;
  badgeCount?: number;
};

function NavigationIcon({ href }: { href: string }) {
  const className = "h-[18px] w-[18px] shrink-0 fill-none";
  const common = { stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (href.includes("dashboard")) return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...common}><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-13h6V4h-6v3Z" /></svg>;
  if (href.includes("approvals") || href.includes("landlords")) return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...common}><path d="M9 11 11 13 15.5 8.5" /><path d="M6 3h12v18H6z" /><path d="M9 17h6" /></svg>;
  if (href.includes("units") || href.includes("my-rental")) return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...common}><path d="M3 21h18M5 21V5l7-2 7 2v16" /><path d="M9 9h.01M9 13h.01M15 9h.01M15 13h.01M10 21v-4h4v4" /></svg>;
  if (href.includes("tenants") || href.endsWith("/users")) return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
  if (href.includes("rent-monitoring")) return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...common}><path d="M3 3v18h18" /><path d="m7 16 4-5 3 2 5-7" /></svg>;
  if (href.includes("payments")) return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...common}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></svg>;
  if (href.includes("maintenance")) return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...common}><path d="M14.7 6.3a4 4 0 0 0-5-5L12 3.6 9.6 6 7.3 3.7a4 4 0 0 0 5 5L20 16.4a2.1 2.1 0 0 1-3 3l-7.7-7.7" /><path d="m5 13-3 3 6 6 3-3" /></svg>;
  if (href.includes("messages")) return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" /><path d="M8 9h8M8 13h5" /></svg>;
  if (href.includes("reports")) return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...common}><path d="M6 2h9l4 4v16H6z" /><path d="M14 2v5h5M9 12h6M9 16h6" /></svg>;
  if (href.includes("user-control")) return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...common}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>;
}

type AppShellProps = {
  profile: Profile;
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
  const sidePanelItems = navItems.filter((item) => item.label !== "Notifications" && item.label !== "Profile Settings");

  return (
    <nav aria-label="Portal navigation" className="grid gap-2">
      {sidePanelItems.map((item, index) => (
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
            <span className="flex min-w-0 items-center gap-3">
              <NavigationIcon href={item.href} />
              <span className="truncate">{item.label}</span>
            </span>
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

function SidebarFooter({ dark = false }: { dark?: boolean }) {
  return (
    <div className="mt-5">
      <LogoutButton dark={dark} />
    </div>
  );
}

export function AppShell({ profile, title, subtitle, navItems, children }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const totalAttentionCount = navItems.reduce((total, item) => total + (item.badgeCount ?? 0), 0);
  const notificationItem = navItems.find((item) => item.label === "Notifications");
  const profileItem = navItems.find((item) => item.label === "Profile Settings");
  const displayName = `${profile.first_name} ${profile.last_name}`.trim();
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

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

        <div className="shrink-0 rounded-[12px] border border-[#d8e5e2] bg-gradient-to-br from-white to-[#eef5f3] px-2 py-1.5 shadow-sm" aria-label="RentSpace product identity">
          <BrandLogo className="h-auto w-[96px] sm:w-[150px]" priority />
        </div>

        <div className="hidden min-w-0 flex-1 md:block">
          <strong className="block truncate text-[1.2rem] font-bold text-[#0d1b2a]">{title}</strong>
          <small className="block truncate text-sm leading-5 text-[#415a77]">{subtitle}</small>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {notificationItem ? (
            <Link
              href={notificationItem.href}
              aria-label={notificationItem.badgeCount ? `Notifications, ${notificationItem.badgeCount} unread` : "Notifications"}
              title="Notifications"
              className={`relative grid h-10 w-10 place-items-center rounded-full border transition sm:h-11 sm:w-11 ${
                isActivePath(pathname, notificationItem.href)
                  ? "border-[#315a57] bg-[#294d4b] text-white"
                  : "border-[#d8e5e2] bg-white text-[#294d4b] hover:border-[#315a57] hover:bg-[#edf4f2]"
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 21h4" />
              </svg>
              {notificationItem.badgeCount && notificationItem.badgeCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#d6a91f] px-1 text-[9px] font-bold leading-none text-[#223b3a] ring-2 ring-white">
                  {notificationItem.badgeCount > 99 ? "99+" : notificationItem.badgeCount}
                </span>
              ) : null}
            </Link>
          ) : null}

          <Link
            href={profileItem?.href ?? "/profile"}
            aria-label="Open profile settings"
            title="Profile settings"
            className={`flex h-10 items-center gap-2 rounded-full border p-1 pr-1 transition sm:h-11 sm:pr-3 ${
              isActivePath(pathname, profileItem?.href ?? "/profile")
                ? "border-[#315a57] bg-[#edf4f2]"
                : "border-[#d8e5e2] bg-white hover:border-[#315a57] hover:bg-[#f4f8f7]"
            }`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#dce9e6] text-[10px] font-bold text-[#294d4b] sm:h-9 sm:w-9 sm:text-xs">
              {profile.profile_photo_url ? (
                // Profile photo URLs are generated at runtime by the configured Supabase project.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.profile_photo_url} alt="" className="h-full w-full object-cover" />
              ) : initials}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-32 truncate text-xs font-semibold text-[#0d1b2a]">{displayName}</span>
              <span className="block text-[10px] font-medium capitalize text-[#60736f]">{profile.role}</span>
            </span>
            <svg aria-hidden="true" viewBox="0 0 20 20" className="hidden h-3.5 w-3.5 text-[#60736f] sm:block" fill="currentColor">
              <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
            </svg>
          </Link>
        </div>
      </header>

      <div className="grid w-full gap-4 lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="portal-sidebar hidden rounded-[22px] p-4 lg:block lg:min-h-[560px]">
          <div className="mb-5 rounded-[16px] border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e3bd42]">Workspace</p>
            <p className="mt-1 text-sm font-semibold text-white">{title}</p>
          </div>
          <NavigationLinks navItems={navItems} pathname={pathname} dark />
          <SidebarFooter dark />
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
            <SidebarFooter dark />
          </div>
        </aside>
      </div>
    </div>
  );
}