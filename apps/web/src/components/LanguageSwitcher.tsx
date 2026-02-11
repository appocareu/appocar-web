"use client";

import { useI18n, type Locale } from "@/components/I18nProvider";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span className="muted" style={{ fontSize: "0.85rem" }}>{t("lang.label")}</span>
      <select
        className="input"
        style={{ padding: "0.35rem 0.6rem", width: "auto" }}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        <option value="en">{t("lang.en")}</option>
        <option value="cs">{t("lang.cs")}</option>
        <option value="uk">{t("lang.uk")}</option>
        <option value="de">{t("lang.de")}</option>
        <option value="pl">{t("lang.pl")}</option>
        <option value="ru">{t("lang.ru")}</option>
      </select>
    </label>
  );
}
