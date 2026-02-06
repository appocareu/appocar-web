"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { mockListings } from "@appocar/shared";
import { ListingCard } from "@/components/ListingCard";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/components/I18nProvider";

export default function HomePage() {
  return (
    <AppShell active="/">
      <section className="hero">
        <div className="glass hero-card">
          <HomeHero />
        </div>
        <div className="grid">
          <HomeKpis />
        </div>
      </section>

      <section className="grid" style={{ gap: "1.2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="section-title"><HomeText id="section.featured" /></h2>
          <Link href="/search" className="secondary">
            <HomeText id="section.viewAll" />
          </Link>
        </div>
        <div className="listing-grid">
          {mockListings.slice(0, 3).map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function HomeHero() {
  const { t } = useI18n();
  return (
    <>
      <Logo size={36} />
      <div className="badge">{t("badge.marketplace")}</div>
      <h1 className="hero-title">{t("hero.title")}</h1>
      <p className="hero-subtitle">{t("hero.subtitle")}</p>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Link href="/search" className="primary">
          {t("cta.search")}
        </Link>
        <Link href="/sell" className="secondary">
          {t("cta.sell")}
        </Link>
      </div>
    </>
  );
}

function HomeKpis() {
  const { t } = useI18n();
  return (
    <>
      <div className="surface card">
        <div className="kpi">42,500+</div>
        <div className="muted">{t("kpi.listings")}</div>
      </div>
      <div className="surface card">
        <div className="kpi">98%</div>
        <div className="muted">{t("kpi.response")}</div>
      </div>
      <div className="surface card">
        <div className="kpi">7.2k</div>
        <div className="muted">{t("kpi.alerts")}</div>
      </div>
    </>
  );
}

function HomeText({ id }: { id: string }) {
  const { t } = useI18n();
  return <>{t(id)}</>;
}
