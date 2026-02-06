"use client";

import Link from "next/link";
import type { Listing } from "@appocar/shared";
import { ListingActions } from "@/components/ListingActions";
import { useI18n } from "@/components/I18nProvider";
import { ListingGallery } from "@/components/ListingGallery";

export function ListingView({ listing }: { listing: Listing }) {
  const { t } = useI18n();

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

      <div className="grid" style={{ gridTemplateColumns: "1.2fr 0.8fr", gap: "1.5rem" }}>
        <div className="surface" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
          <h3 className="section-title" style={{ fontSize: "1.4rem" }}>{t("listing.highlights")}</h3>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
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
        <ListingActions listingId={listing.id} sellerName={listing.sellerName} />
      </div>
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
