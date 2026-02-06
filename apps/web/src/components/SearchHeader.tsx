"use client";

import { useI18n } from "@/components/I18nProvider";

export function SearchHeader() {
  const { t } = useI18n();
  return (
    <div>
      <h2 className="section-title">{t("search.title")}</h2>
      <p className="muted">{t("search.subtitle")}</p>
    </div>
  );
}
