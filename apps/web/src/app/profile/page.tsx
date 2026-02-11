"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/components/I18nProvider";
import { ListingCard } from "@/components/ListingCard";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

type Listing = {
  id: string;
  title: string;
  price: number;
  currency: string;
  year: number;
  mileage_km: number;
  fuel: string;
  transmission: string;
  power_kw: number;
  location: string;
  images: string[];
  seller_name: string;
  seller_type: string;
  created_at: string;
  body: string;
  color: string;
  drive: string;
  doors: number;
  seats: number;
  description: string;
  features: string[];
};

type HistoryItem = {
  id: string;
  action: string;
  created_at: string;
};

export default function ProfilePage() {
  const { t } = useI18n();
  const { user, requestVerification } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedSearches, setSavedSearches] = useState<Array<{ id: string; label: string; params: string }>>([]);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "sent" | "error">("idle");

  useEffect(() => {
    const run = async () => {
      try {
        const [myListings, myHistory] = await Promise.all([
          api<{ items: Listing[] }>("/api/my-listings").catch(() => ({ items: [] })),
          api<{ items: HistoryItem[] }>("/api/my-history").catch(() => ({ items: [] }))
        ]);
        setListings(myListings.items ?? []);
        setHistory(myHistory.items ?? []);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("appocar_saved_searches");
      if (stored) {
        setSavedSearches(JSON.parse(stored));
      }
    } catch {
      setSavedSearches([]);
    }
  }, []);

  return (
    <AppShell active="/profile">
      <div className="page-header">
        <div>
          <h2 className="section-title">{t("profile.title")}</h2>
          <p className="muted">{t("profile.subtitle")}</p>
        </div>
      </div>

      {user && (
        <section className="surface card" style={{ padding: "1.2rem", marginBottom: "1.6rem" }}>
          <div className="section-header" style={{ marginBottom: "0.8rem" }}>
            <h3 className="section-title" style={{ fontSize: "1rem" }}>{t("profile.emailStatus")}</h3>
          </div>
          <div className="grid" style={{ gap: "0.6rem" }}>
            <div className="muted">
              {user.email} · {user.emailVerified ? t("profile.emailVerified") : t("profile.emailUnverified")}
            </div>
            {!user.emailVerified && (
              <div className="grid" style={{ gap: "0.4rem" }}>
                <button
                  className="secondary"
                  onClick={async () => {
                    const res = await requestVerification(user.email);
                    setVerifyStatus(res.ok ? "sent" : "error");
                  }}
                >
                  {verifyStatus === "sent" ? t("profile.verifyEmailSent") : t("profile.verifyEmail")}
                </button>
                {verifyStatus === "error" && <div className="muted">{t("auth.genericError")}</div>}
              </div>
            )}
          </div>
        </section>
      )}

      {loading && <div className="glass" style={{ padding: "1.5rem" }}>{t("auth.loading")}</div>}

      {!loading && (
        <div className="grid" style={{ gap: "1.6rem" }}>
          <section className="grid" style={{ gap: "1rem" }}>
            <div className="section-header">
              <h3 className="section-title">{t("profile.myListings")}</h3>
            </div>
            <div className="listing-grid">
              {listings.length === 0 && <div className="muted">{t("profile.emptyListings")}</div>}
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={{
                    id: listing.id,
                    title: listing.title,
                    price: Number(listing.price),
                    currency: listing.currency,
                    year: listing.year,
                    mileageKm: listing.mileage_km,
                    fuel: listing.fuel as any,
                    transmission: listing.transmission as any,
                    powerKw: listing.power_kw,
                    location: listing.location,
                    images: listing.images,
                    sellerName: listing.seller_name,
                    sellerType: listing.seller_type as any,
                    createdAt: listing.created_at,
                    body: listing.body as any,
                    color: listing.color,
                    drive: listing.drive as any,
                    doors: listing.doors,
                    seats: listing.seats,
                    description: listing.description,
                    features: listing.features
                  }}
                />
              ))}
            </div>
          </section>

          <section className="surface card" style={{ padding: "1.5rem" }}>
            <div className="section-header">
              <h3 className="section-title">{t("profile.history")}</h3>
            </div>
            <div className="grid" style={{ gap: "0.6rem" }}>
              {history.length === 0 && <div className="muted">{t("profile.emptyHistory")}</div>}
              {history.map((item) => (
                <div key={item.id} className="muted">
                  {item.action} · {new Date(item.created_at).toLocaleDateString()}
                </div>
              ))}
            </div>
          </section>

          <section className="surface card" style={{ padding: "1.5rem" }}>
            <div className="section-header">
              <h3 className="section-title">{t("profile.savedSearches")}</h3>
            </div>
            <div className="filter-categories__list">
              {savedSearches.length === 0 && <div className="muted">{t("profile.emptySavedSearches")}</div>}
              {savedSearches.map((item) => (
                <button
                  key={item.id}
                  className="chip"
                  onClick={() => (window.location.href = `/search?${item.params}`)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
