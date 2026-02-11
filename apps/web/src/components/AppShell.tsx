"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserMenu } from "@/components/UserMenu";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/components/I18nProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/components/AuthProvider";

export function AppShell({
  active,
  children
}: {
  active: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const { user, refreshUser, justVerified } = useAuth();
  const [checkingBanner, setCheckingBanner] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<"idle" | "sent" | "error">("idle");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);
  const navItems = [
    { href: "/", label: t("nav.overview"), icon: "home" },
    { href: "/search", label: t("nav.search"), icon: "search" },
    { href: "/sell", label: t("nav.sell"), icon: "tag" },
    { href: "/services", label: t("nav.services"), icon: "grid" },
  ];
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <main>
      <div className="app-shell">
        <header className="topbar glass">
          <div className="topbar-brand">
            <Logo size={28} />
          </div>
          <nav className="topbar-nav">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={active === item.href ? "topbar-link active" : "topbar-link"}>
                <NavIcon type={item.icon} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="topbar-actions">
            <button
              className="icon-button mobile-search"
              aria-label={t("nav.search")}
              onClick={() => setMobileSearchOpen(true)}
              type="button"
            >
              <SearchIcon />
            </button>
            <Link href="/sell" className="cta-sell">
              {t("sell.ctaHeader")}
            </Link>
            <UserMenu />
            <button
              className="icon-button mobile-toggle"
              aria-label="Menu"
              onClick={() => setMobileOpen((prev) => !prev)}
              type="button"
            >
              <HamburgerIcon />
            </button>
          </div>
        </header>
        {user && user.emailVerified === false && (
          <AutoVerifyRefresh refreshUser={refreshUser} />
        )}
        {user && user.emailVerified === false && (
          <section className="verify-banner app-shell__banner">
            <div className="verify-banner__content">
              <strong>{t("home.verifyBannerTitle")}</strong>
              <span>{t("home.verifyBannerBody")}</span>
            </div>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button
                className="secondary"
                onClick={() => {
                  setCheckingBanner(true);
                  refreshUser().finally(() => setTimeout(() => setCheckingBanner(false), 600));
                }}
              >
                {checkingBanner ? t("home.verifyBannerChecking") : t("home.verifyBannerCheck")}
              </button>
              <button
                className="secondary"
                disabled={resendCooldown > 0}
                onClick={async () => {
                  if (resendCooldown > 0) return;
                  setResendStatus("idle");
                  try {
                    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}/api/auth/verify/request`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include"
                    });
                    setResendStatus("sent");
                    setResendCooldown(60);
                  } catch {
                    setResendStatus("error");
                  }
                }}
              >
                {resendCooldown > 0
                  ? t("home.verifyBannerResendIn", { seconds: resendCooldown })
                  : t("home.verifyBannerResend")}
              </button>
              <a className="secondary" href="/verify-email">
                {t("home.verifyBannerCta")}
              </a>
              {resendStatus === "sent" && <span className="muted">{t("home.verifyBannerSent")}</span>}
              {resendStatus === "error" && <span className="muted">{t("auth.genericError")}</span>}
            </div>
          </section>
        )}
        {justVerified && (
          <div className="toast toast--success">
            <span>{t("toast.emailVerified")}</span>
            <span>✅</span>
          </div>
        )}
        {mobileOpen && (
          <div className="mobile-drawer">
            <nav className="mobile-drawer__nav">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                  {item.label}
                </Link>
              ))}
              <Link href="/profile" onClick={() => setMobileOpen(false)}>
                {t("nav.profile")}
              </Link>
            </nav>
          </div>
        )}
        {mobileSearchOpen && (
          <div className="mobile-search-overlay">
            <div className="mobile-search-card">
              <div className="mobile-search-title">{t("home.searchTitle")}</div>
              <form action="/search" className="mobile-search-form">
                <input
                  className="input"
                  name="query"
                  placeholder={t("header.searchPlaceholder")}
                  aria-label={t("header.searchPlaceholder")}
                />
                <button className="primary" type="submit">{t("nav.search")}</button>
              </form>
              <button className="ghost" type="button" onClick={() => setMobileSearchOpen(false)}>
                {t("filters.close")}
              </button>
            </div>
          </div>
        )}
        <section className="grid" style={{ gap: "2rem" }}>
          {children}
        </section>
        <footer className="site-footer" id="site-footer">
          <div className="site-footer__grid">
            <div>
              <div className="site-footer__title">APPOCAR</div>
              <div className="muted">{t("footer.marketplace")}</div>
            </div>
            <div>
              <div className="site-footer__title">{t("footer.services")}</div>
              <div className="site-footer__links">
                <a href="/services">{t("footer.audit")}</a>
                <a href="/services">{t("footer.logistics")}</a>
                <a href="/services">{t("footer.financing")}</a>
              </div>
            </div>
            <div>
              <div className="site-footer__title">{t("footer.dealers")}</div>
              <div className="site-footer__links">
                <a href="/services">{t("footer.dealerPortal")}</a>
                <a href="/services">{t("footer.partnerships")}</a>
              </div>
            </div>
            <div>
              <div className="site-footer__title">{t("footer.company")}</div>
              <div className="site-footer__links">
                <a href="/services">{t("footer.about")}</a>
                <a href="/services">{t("footer.careers")}</a>
                <a href="/services">{t("footer.support")}</a>
              </div>
            </div>
            <div className="site-footer__lang">
              <LanguageSwitcher />
            </div>
          </div>
          <div className="site-footer__bottom">
            APPOCAR 2026 • All rights reserved
          </div>
        </footer>
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

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function AutoVerifyRefresh({ refreshUser }: { refreshUser: () => Promise<unknown> }) {
  useEffect(() => {
    let interval: number | undefined;
    const start = () => {
      if (interval) return;
      interval = window.setInterval(() => {
        refreshUser();
      }, 5000);
    };
    const stop = () => {
      if (!interval) return;
      window.clearInterval(interval);
      interval = undefined;
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        start();
        refreshUser();
      } else {
        stop();
      }
    };
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshUser]);
  return null;
}
