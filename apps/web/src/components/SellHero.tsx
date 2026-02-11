"use client";

import { useI18n } from "@/components/I18nProvider";

export function SellHero() {
  const { t } = useI18n();

  return (
    <section className="sell-hero">
      <div className="sell-hero__content">
        <div className="sell-hero__eyebrow">{t("sell.heroBadge")}</div>
        <h1>{t("sell.heroTitle")}</h1>
        <p className="sell-hero__subtitle">{t("sell.heroSubtitle")}</p>
        <div className="sell-hero__meta">{t("sell.heroNote")}</div>
        <div className="sell-hero__actions">
          <a className="primary sell-hero__cta" href="#sell-wizard">
            {t("sell.heroCTA")}
          </a>
          <button className="ghost">{t("sell.heroSecondary")}</button>
        </div>
      </div>
      <div className="sell-hero__card">
        <div className="sell-hero__card-title">{t("sell.heroCardTitle")}</div>
        <ul className="sell-hero__list">
          <li>{t("sell.heroCardPoint1")}</li>
          <li>{t("sell.heroCardPoint2")}</li>
          <li>{t("sell.heroCardPoint3")}</li>
        </ul>
      </div>
    </section>
  );
}
