"use client";

import { SellClient } from "@/components/SellClient";
import { AuthPanel } from "@/components/AuthPanel";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/components/I18nProvider";

export function SellGate() {
  const { user, ready } = useAuth();
  const { t } = useI18n();

  if (!ready) {
    return <div className="glass" style={{ padding: "1.5rem" }}>Loading...</div>;
  }

  if (!user) {
    return (
      <div className="grid" style={{ gap: "1rem" }}>
        <div>
          <h2 className="section-title">{t("sell.title")}</h2>
          <p className="muted">{t("sell.subtitle")}</p>
        </div>
        <AuthPanel mode="signup" />
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div>
        <h2 className="section-title">{t("sell.title")}</h2>
        <p className="muted">{t("sell.subtitle")}</p>
      </div>
      <SellClient />
    </div>
  );
}
