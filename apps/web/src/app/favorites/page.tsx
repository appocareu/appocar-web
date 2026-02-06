"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ListingCard } from "@/components/ListingCard";
import { mockListings } from "@appocar/shared";
import { supabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { AuthPanel } from "@/components/AuthPanel";
import { useI18n } from "@/components/I18nProvider";

export default function FavoritesPage() {
  const { user, ready } = useAuth();
  const { t } = useI18n();
  const [favoriteIds, setFavoriteIds] = useState<string[]>(["l1", "l3"]);
  const [favoriteListings, setFavoriteListings] = useState(mockListings);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabaseClient || !user) return;
    setLoading(true);
    const client = supabaseClient;
    if (!client || !user) return;

    const run = async () => {
      try {
        const { data } = await client
          .from("favorites")
          .select("listing_id, listings (*)")
          .eq("user_id", user.id);
        if (data) {
          setFavoriteIds(data.map((row) => row.listing_id));
          const listings = data
            .map((row: any) => row.listings)
            .filter(Boolean);
          if (listings.length > 0) {
            setFavoriteListings(
              listings.map((record: any) => ({
                id: record.id,
                title: record.title,
                price: Number(record.price),
                currency: record.currency,
                year: record.year,
                mileageKm: record.mileage_km,
                fuel: record.fuel,
                transmission: record.transmission,
                powerKw: record.power_kw,
                location: record.location,
                images: record.images,
                sellerName: record.seller_name,
                sellerType: record.seller_type,
                createdAt: record.created_at,
                body: record.body,
                color: record.color,
                drive: record.drive,
                doors: record.doors,
                seats: record.seats,
                description: record.description,
                features: record.features
              }))
            );
          }
        }
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [user]);

  const favorites = useMemo(() => {
    if (supabaseClient && user) return favoriteListings;
    return mockListings.filter((listing) => favoriteIds.includes(listing.id));
  }, [favoriteIds, favoriteListings, user]);

  return (
    <AppShell active="/favorites">
      <div>
        <h2 className="section-title">{t("favorites.title")}</h2>
        <p className="muted">{t("favorites.subtitle")}</p>
      </div>
      {!ready ? (
        <div className="glass" style={{ padding: "1.5rem" }}>{t("auth.loading")}</div>
      ) : !user ? (
        <AuthPanel />
      ) : (
      <div className="listing-grid">
        {loading && <div className="muted">{t("favorites.syncing")}</div>}
        {favorites.map((listing) => (
          <div key={listing.id}>
            <ListingCard listing={listing} />
            <button
              className="secondary"
              style={{ marginTop: "0.7rem" }}
              onClick={async () => {
                setFavoriteIds((ids) => ids.filter((id) => id !== listing.id));
                if (supabaseClient && user) {
                  await supabaseClient
                    .from("favorites")
                    .delete()
                    .eq("listing_id", listing.id)
                    .eq("user_id", user.id);
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
