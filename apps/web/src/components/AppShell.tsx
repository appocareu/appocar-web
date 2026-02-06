"use client";

import Link from "next/link";
import { UserMenu } from "@/components/UserMenu";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/components/I18nProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function AppShell({
  active,
  children
}: {
  active: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const navItems = [
    { href: "/", label: t("nav.overview"), icon: "home" },
    { href: "/search", label: t("nav.search"), icon: "search" },
    { href: "/sell", label: t("nav.sell"), icon: "tag" },
    { href: "/favorites", label: t("nav.favorites"), icon: "heart" },
    { href: "/messages", label: t("nav.messages"), icon: "chat" },
    { href: "/admin", label: t("nav.admin"), icon: "grid" }
  ];

  return (
    <main>
      <div className="app-shell">
        <aside className="glass nav">
          <div style={{ padding: "0.4rem 0.2rem" }}>
            <Logo />
          </div>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={active === item.href ? "active nav-link" : "nav-link"}>
              <NavIcon type={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </aside>
        <section className="grid" style={{ gap: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <LanguageSwitcher />
            <UserMenu />
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

function NavIcon({ type }: { type: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 };

  if (type === "home") {
    return <svg {...common}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>;
  }
  if (type === "search") {
    return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
  }
  if (type === "tag") {
    return <svg {...common}><path d="M20 12 12 20l-8-8V4h8z" /><circle cx="9" cy="9" r="1.5" /></svg>;
  }
  if (type === "heart") {
    return <svg {...common}><path d="M12 20s-7-4.7-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.3-7 10-7 10Z" /></svg>;
  }
  if (type === "chat") {
    return <svg {...common}><path d="M21 14a7 7 0 0 1-7 7H7l-4 3V7a4 4 0 0 1 4-4h7a7 7 0 0 1 7 7Z" /></svg>;
  }
  return <svg {...common}><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></svg>;
}
