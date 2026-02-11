"use client";

import Link from "next/link";
import type { Listing } from "@appocar/shared";
import { useEffect } from "react";
import { ListingActions } from "@/components/ListingActions";
import { useI18n } from "@/components/I18nProvider";
import { ListingGallery } from "@/components/ListingGallery";
import { ListingCard } from "@/components/ListingCard";
import { api } from "@/lib/api";

export function ListingView({ listing, similar = [] }: { listing: Listing; similar?: Listing[] }) {
  const { t } = useI18n();

  useEffect(() => {
    api(`/api/listings/${listing.id}/view`, { method: "POST" }).catch(() => undefined);
  }, [listing.id]);

  return (
    <section className="grid" style={{ gap: "1.6rem" }}>
      <div className="glass" style={{ padding: "1.5rem" }}>
        <div style={{ display: "grid", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h2 className="section-title">{listing.title}</h2>
              <p className="muted">{listing.location} · {listing.sellerType}</p>
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>
              {listing.price.toLocaleString()} {listing.currency}
            </div>
          </div>
          <ListingGallery images={listing.images} title={listing.title} />
        </div>
      </div>

      <div className="listing-layout">
        <div className="surface listing-panel">
          <h3 className="section-title" style={{ fontSize: "1.4rem" }}>{t("listing.highlights")}</h3>
          <div className="listing-specs">
            <div><strong>{listing.year}</strong><div className="muted">{t("listing.yearLabel")}</div></div>
            <div><strong>{listing.mileageKm.toLocaleString()} km</strong><div className="muted">{t("listing.mileageLabel")}</div></div>
            <div><strong>{listing.fuel}</strong><div className="muted">{t("listing.fuelLabel")}</div></div>
            <div><strong>{listing.transmission}</strong><div className="muted">{t("listing.transmissionLabel")}</div></div>
            <div><strong>{listing.powerKw} kW</strong><div className="muted">{t("listing.powerLabel")}</div></div>
            <div><strong>{listing.drive}</strong><div className="muted">{t("listing.driveLabel")}</div></div>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: "0.4rem" }}>{t("listing.description")}</h4>
            <p className="muted">{listing.description}</p>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: "0.4rem" }}>{t("listing.features")}</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
              {listing.features.map((feature) => (
                <span key={feature} className="badge">{feature}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="listing-actions">
          <ListingActions
            listingId={listing.id}
            sellerName={listing.sellerName}
            sellerEmail={listing.sellerEmail}
            phone={listing.phone}
            whatsapp={listing.whatsapp}
          />
          <div className="surface" style={{ padding: "1.2rem", marginTop: "1rem", display: "grid", gap: "0.6rem" }}>
            <div className="card-title">{t("listing.auditTitle")}</div>
            <div className="muted">{t("listing.auditBody")}</div>
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="grid" style={{ gap: "1rem" }}>
          <div className="section-header">
            <h3 className="section-title">{t("listing.similar")}</h3>
          </div>
          <div className="listing-grid">
            {similar.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

export function ListingNotFound() {
  const { t } = useI18n();
  return (
    <div className="glass" style={{ padding: "2rem" }}>
      <h2 className="section-title">{t("listing.notFound")}</h2>
      <p className="muted">{t("listing.notFoundText")}</p>
      <Link href="/search" className="secondary" style={{ marginTop: "1rem" }}>
        {t("listing.backToSearch")}
      </Link>
    </div>
  );
}
