"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ListingCard } from "@/components/ListingCard";
import { mockListings } from "@appocar/shared";
import { useAuth } from "@/components/AuthProvider";
import { AuthPanel } from "@/components/AuthPanel";
import { useI18n } from "@/components/I18nProvider";
import { api } from "@/lib/api";

export default function FavoritesPage() {
  const { user, ready } = useAuth();
  const { t } = useI18n();
  const [favoriteIds, setFavoriteIds] = useState<string[]>(["l1", "l3"]);
  const [favoriteListings, setFavoriteListings] = useState(mockListings);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api<{ items: any[] }>("/api/favorites")
      .then((res) => {
        const items = Array.isArray(res.items) ? res.items : [];
        setFavoriteIds(items.map((row) => row.listing_id ?? row.id));
        if (items.length > 0) {
          setFavoriteListings(
            items.map((record: any) => ({
              id: record.id ?? record.listing_id,
              title: record.title,
              price: Number(record.price),
              currency: record.currency,
              year: record.year,
              mileageKm: record.mileage_km ?? record.mileageKm ?? 0,
              fuel: record.fuel,
              transmission: record.transmission,
              powerKw: record.power_kw ?? record.powerKw ?? 0,
              location: record.location,
              images: record.images ?? [],
              sellerName: record.seller_name ?? record.sellerName ?? "Seller",
              sellerEmail: record.seller_email ?? record.sellerEmail ?? undefined,
              sellerType: record.seller_type ?? record.sellerType ?? "Dealer",
              createdAt: record.created_at ?? record.createdAt ?? new Date().toISOString(),
              body: record.body ?? "Sedan",
              color: record.color ?? "",
              drive: record.drive ?? "FWD",
              doors: record.doors ?? 4,
              seats: record.seats ?? 5,
              description: record.description ?? "",
              features: record.features ?? []
            }))
          );
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  const favorites = useMemo(() => {
    if (user) return favoriteListings;
    return mockListings.filter((listing) => favoriteIds.includes(listing.id));
  }, [favoriteIds, favoriteListings, user]);

  return (
    <AppShell active="/favorites">
      <div className="page-header">
        <div>
          <h2 className="section-title">{t("favorites.title")}</h2>
          <p className="muted">{t("favorites.subtitle")}</p>
        </div>
        <div className="page-header__badge">Saved listings</div>
      </div>
      {!ready ? (
        <div className="glass" style={{ padding: "1.5rem" }}>{t("auth.loading")}</div>
      ) : !user ? (
        <AuthPanel />
      ) : (
      <div className="listing-grid">
        {loading && <div className="muted">{t("favorites.syncing")}</div>}
        {favorites.map((listing) => (
          <div key={listing.id} className="favorite-card">
            <ListingCard listing={listing} />
            <button
              className="secondary"
              style={{ marginTop: "0.7rem" }}
              onClick={async () => {
                setFavoriteIds((ids) => ids.filter((id) => id !== listing.id));
                if (user) {
                  await api(`/api/favorites/${listing.id}`, { method: "DELETE" });
                }
              }}
            >
              {t("favorites.remove")}
            </button>
          </div>
        ))}
      </div>
      )}
    </AppShell>
  );
}
