"use client";

import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/components/I18nProvider";

export default function ServicesPage() {
  return (
    <AppShell active="/services">
      <ServicesContent />
    </AppShell>
  );
}

function ServicesContent() {
  const { t } = useI18n();
  return (
    <section className="grid" style={{ gap: "1.5rem" }}>
      <div className="page-header">
        <div>
          <h2 className="section-title">{t("nav.services")}</h2>
          <p className="muted">{t("footer.marketplace")}</p>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="surface card">
          <div className="card-title">{t("footer.audit")}</div>
          <div className="muted">{t("services.auditCopy")}</div>
        </div>
        <div className="surface card">
          <div className="card-title">{t("footer.logistics")}</div>
          <div className="muted">{t("services.logisticsCopy")}</div>
        </div>
        <div className="surface card">
          <div className="card-title">{t("footer.financing")}</div>
          <div className="muted">{t("services.financingCopy")}</div>
        </div>
        <div className="surface card">
          <div className="card-title">{t("footer.insurance")}</div>
          <div className="muted">{t("services.insuranceCopy")}</div>
        </div>
      </div>
    </section>
  );
}
