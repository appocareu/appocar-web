"use client";

import { useMemo, useState } from "react";
import type { FilterState, Listing } from "@appocar/shared";
import { ListingCard } from "./ListingCard";
import { useI18n } from "@/components/I18nProvider";

export function SearchClient({ listings }: { listings: Listing[] }) {
  const { t } = useI18n();
  const [filters, setFilters] = useState<FilterState>({ query: "" });

  const filtered = useMemo(() => {
    return listings.filter((listing) => {
      if (filters.query && !listing.title.toLowerCase().includes(filters.query.toLowerCase())) {
        return false;
      }
      if (filters.priceMin && listing.price < filters.priceMin) return false;
      if (filters.priceMax && listing.price > filters.priceMax) return false;
      if (filters.yearMin && listing.year < filters.yearMin) return false;
      if (filters.yearMax && listing.year > filters.yearMax) return false;
      if (filters.mileageMax && listing.mileageKm > filters.mileageMax) return false;
      if (filters.fuel && listing.fuel !== filters.fuel) return false;
      if (filters.transmission && listing.transmission !== filters.transmission) return false;
      if (filters.body && listing.body !== filters.body) return false;
      if (filters.drive && listing.drive !== filters.drive) return false;
      return true;
    });
  }, [listings, filters]);

  return (
    <div className="grid" style={{ gap: "1.5rem" }}>
      <div className="glass" style={{ padding: "1.5rem" }}>
        <div className="filter-row">
          <input
            className="input"
            placeholder={t("filters.query")}
            value={filters.query}
            onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
          />
          <input
            className="input"
            placeholder={t("filters.minPrice")}
            type="number"
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                priceMin: event.target.value ? Number(event.target.value) : undefined
              }))
            }
          />
          <input
            className="input"
            placeholder={t("filters.maxPrice")}
            type="number"
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                priceMax: event.target.value ? Number(event.target.value) : undefined
              }))
            }
          />
          <input
            className="input"
            placeholder={t("filters.maxMileage")}
            type="number"
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                mileageMax: event.target.value ? Number(event.target.value) : undefined
              }))
            }
          />
          <select
            className="input"
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                fuel: event.target.value ? (event.target.value as FilterState["fuel"]) : undefined
              }))
            }
          >
            <option value="">{t("filters.fuel")}</option>
            <option value="Petrol">{t("filters.petrol")}</option>
            <option value="Diesel">{t("filters.diesel")}</option>
            <option value="Hybrid">{t("filters.hybrid")}</option>
            <option value="Plug-in Hybrid">{t("filters.plugInHybrid")}</option>
            <option value="Electric">{t("filters.electric")}</option>
          </select>
          <select
            className="input"
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                transmission: event.target.value
                  ? (event.target.value as FilterState["transmission"])
                  : undefined
              }))
            }
          >
            <option value="">{t("filters.transmission")}</option>
            <option value="Automatic">{t("filters.automatic")}</option>
            <option value="Manual">{t("filters.manual")}</option>
          </select>
          <select
            className="input"
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                body: event.target.value ? (event.target.value as FilterState["body"]) : undefined
              }))
            }
          >
            <option value="">{t("filters.body")}</option>
            <option value="SUV">{t("filters.suv")}</option>
            <option value="Sedan">{t("filters.sedan")}</option>
            <option value="Hatchback">{t("filters.hatchback")}</option>
            <option value="Coupe">{t("filters.coupe")}</option>
            <option value="Wagon">{t("filters.wagon")}</option>
            <option value="Convertible">{t("filters.convertible")}</option>
          </select>
        </div>
      </div>

      <div className="listing-grid">
        {filtered.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
