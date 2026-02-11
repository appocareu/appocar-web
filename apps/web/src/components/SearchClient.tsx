"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FilterState, Listing } from "@appocar/shared";
import { ListingCard } from "./ListingCard";
import { useI18n } from "@/components/I18nProvider";
import { BRANDS, fetchBrandsFromBackend, fetchModelsFromBackend } from "@/lib/brands";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

const POPULAR_LOCATIONS = [
  "Praha",
  "Brno",
  "Ostrava",
  "Bratislava",
  "Vienna",
  "Berlin",
  "Munich",
  "Warsaw",
  "Krakow",
  "Paris",
  "Hamburg",
  "Prague",
  "Cologne"
];

type SearchClientProps = {
  listings: Listing[];
  totalCount?: number;
  serverPageSize?: number;
};

export function SearchClient({ listings, totalCount, serverPageSize }: SearchClientProps) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [filters, setFilters] = useState<FilterState>({ query: "" });
  const [sort, setSort] = useState("relevance");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedTab, setAdvancedTab] = useState<"basic" | "tech" | "comfort" | "ev" | "seller" | "other">("basic");
  const [page, setPage] = useState(1);
  const pageSize = serverPageSize ?? 12;
  const [saved, setSaved] = useState<Array<{ id: string; label: string; params: string }>>([]);
  const [powerUnit, setPowerUnit] = useState<"kW" | "HP">("kW");
  const [powerMinInput, setPowerMinInput] = useState("");
  const [powerMaxInput, setPowerMaxInput] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ label: string; lat: number; lng: number }>>([]);
  const [brandOptions, setBrandOptions] = useState(BRANDS);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [makeSearch, setMakeSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSelected, setLocationSelected] = useState<string[]>([]);
  const lastImpressionKey = useRef<string>("");
  const [sidebarDropdown, setSidebarDropdown] = useState<
    null | "make" | "year" | "price" | "location" | "fuel" | "transmission"
  >(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const isCategoryActive = (href: string) => {
    const queryIndex = href.indexOf("?");
    if (queryIndex === -1) return false;
    const params = new URLSearchParams(href.slice(queryIndex + 1));
    if (!params.toString()) return false;
    return Array.from(params.entries()).every(([key, value]) => {
      const current = searchParams.get(key);
      if (!current) return false;
      if (current.includes(",")) {
        return current.split(",").includes(value);
      }
      return current === value;
    });
  };

  useEffect(() => {
    fetchBrandsFromBackend().then(setBrandOptions);
  }, []);

  useEffect(() => {
    fetchModelsFromBackend(filters.make ?? "").then(setModelOptions);
  }, [filters.make]);

  useEffect(() => {
    if (!sidebarDropdown) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (sidebarRef.current && !sidebarRef.current.contains(target)) {
        setSidebarDropdown(null);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [sidebarDropdown]);

  useEffect(() => {
    if (sidebarDropdown !== "make") return;
    setMakeSearch("");
    setModelSearch("");
  }, [sidebarDropdown]);

  useEffect(() => {
    if (sidebarDropdown !== "location") return;
    setLocationSearch("");
    setLocationSelected(
      filters.location
        ? filters.location
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : []
    );
  }, [sidebarDropdown, filters.location]);

  const categories = [
    { label: t("home.categorySedan"), href: "/search?body=Sedan" },
    { label: t("home.categorySuv"), href: "/search?body=SUV" },
    { label: t("home.categoryElectric"), href: "/search?fuel=Electric" },
    { label: t("home.categoryWagon"), href: "/search?body=Wagon" },
    { label: t("home.categoryLuxury"), href: "/search?category=Luxury" },
    { label: t("home.categoryDeals"), href: "/search?category=Deals" }
  ];

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: current - 1990 + 1 }, (_, index) => current - index);
  }, []);

  const priceOptions = useMemo(() => {
    return [0, 5000, 10000, 15000, 20000, 30000, 40000, 50000, 75000, 100000, 150000];
  }, []);

  const brandQuery = makeSearch.trim().toLowerCase();
  const topBrands = brandOptions.slice(0, 10);
  const filteredBrands = brandOptions.filter((brand) => brand.toLowerCase().includes(brandQuery));
  const modelQuery = modelSearch.trim().toLowerCase();
  const filteredModels = modelOptions.filter((model) => model.toLowerCase().includes(modelQuery));
  const fuelLabel = useMemo(() => {
    if (!filters.fuel) return t("filters.fuel");
    const items = Array.isArray(filters.fuel) ? filters.fuel : [filters.fuel];
    if (items.length === 0) return t("filters.fuel");
    return items
      .map((item) => t(`filters.${item === "Plug-in Hybrid" ? "plugInHybrid" : item.toLowerCase()}`))
      .join(", ");
  }, [filters.fuel, t]);
  const locationLabel = useMemo(() => {
    if (!filters.location) return t("filters.location");
    if (filters.locationRadius) return `${filters.location} · ${filters.locationRadius} km`;
    return filters.location;
  }, [filters.location, filters.locationRadius, t]);

  const toggleArrayFilter = <T extends string>(
    current: T | T[] | undefined,
    value: T
  ) => {
    const next = new Set(Array.isArray(current) ? current : current ? [current] : []);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next.size ? Array.from(next) : undefined;
  };

  const filtered = useMemo(() => {
    const base = listings.filter((listing) => {
      if (filters.query && !listing.title.toLowerCase().includes(filters.query.toLowerCase())) {
        return false;
      }
      if (filters.make && !listing.title.toLowerCase().includes(filters.make.toLowerCase())) {
        return false;
      }
      if (filters.model && !listing.title.toLowerCase().includes(filters.model.toLowerCase())) {
        return false;
      }
      if (filters.priceMin && listing.price < filters.priceMin) return false;
      if (filters.priceMax && listing.price > filters.priceMax) return false;
      if (filters.yearMin && listing.year < filters.yearMin) return false;
      if (filters.yearMax && listing.year > filters.yearMax) return false;
      if (filters.mileageMin && listing.mileageKm < filters.mileageMin) return false;
      if (filters.mileageMax && listing.mileageKm > filters.mileageMax) return false;
      if (filters.fuel) {
        const fuels = Array.isArray(filters.fuel) ? filters.fuel : [filters.fuel];
        if (!fuels.includes(listing.fuel)) return false;
      }
      if (filters.transmission && listing.transmission !== filters.transmission) return false;
      if (filters.body) {
        const bodies = Array.isArray(filters.body) ? filters.body : [filters.body];
        if (!bodies.includes(listing.body)) return false;
      }
      if (filters.drive && listing.drive !== filters.drive) return false;
      if (filters.sellerType && listing.sellerType !== filters.sellerType) return false;
      if (filters.dealType) {
        if (listing.dealType) {
          if (listing.dealType !== filters.dealType) return false;
        } else if (filters.dealType === "leasing") {
          const hasLeasing = listing.features?.some((item) => item.toLowerCase().includes("leasing"));
          if (!hasLeasing) return false;
        }
      }
      if (filters.verifiedOnly) {
        if (typeof listing.verified === "boolean") {
          if (!listing.verified) return false;
        } else if (listing.sellerType !== "Dealer") {
          return false;
        }
      }
      if (filters.color && listing.color.toLowerCase() !== filters.color.toLowerCase()) return false;
      if (filters.location) {
        const terms = filters.location.split(",").map((item) => item.trim()).filter(Boolean);
        if (terms.length === 0) {
          // no-op
        } else if (terms.length === 1) {
          if (!listing.location.toLowerCase().includes(terms[0].toLowerCase())) return false;
        } else {
          const hit = terms.some((term) => listing.location.toLowerCase().includes(term.toLowerCase()));
          if (!hit) return false;
        }
      }
      if (filters.doors && listing.doors !== filters.doors) return false;
      if (filters.seats && listing.seats !== filters.seats) return false;
      if (filters.powerMin && listing.powerKw < filters.powerMin) return false;
      if (filters.powerMax && listing.powerKw > filters.powerMax) return false;
      if (filters.evRangeMin && (!listing.evRangeKm || listing.evRangeKm < filters.evRangeMin)) return false;
      if (filters.evBatteryMin && (!listing.evBatteryKwh || listing.evBatteryKwh < filters.evBatteryMin)) return false;
      if (filters.evFastChargeMin && (!listing.evFastChargeKw || listing.evFastChargeKw < filters.evFastChargeMin)) return false;
      if (filters.evChargeType && (!listing.evChargeType || !listing.evChargeType.toLowerCase().includes(filters.evChargeType.toLowerCase()))) return false;
      if (filters.co2Min && (!listing.co2Gkm || listing.co2Gkm < filters.co2Min)) return false;
      if (filters.co2Max && (!listing.co2Gkm || listing.co2Gkm > filters.co2Max)) return false;
      if (filters.consumptionMin || filters.consumptionMax) {
        const value = parseConsumption(listing.consumption);
        if (filters.consumptionMin && (value == null || value < filters.consumptionMin)) return false;
        if (filters.consumptionMax && (value == null || value > filters.consumptionMax)) return false;
      }
      if (filters.features && filters.features.length > 0) {
        const set = new Set(listing.features.map((f) => f.toLowerCase()));
        if (!filters.features.every((f) => set.has(f.toLowerCase()))) return false;
      }
      if (filters.category) {
        if (filters.category === "Luxury" && listing.price < 45000) return false;
        if (filters.category === "Deals" && listing.price > 20000) return false;
        if (filters.category === "NewArrivals" && listing.year < 2021) return false;
        if (filters.category === "Vans" && listing.body !== "Wagon" && listing.body !== "SUV") return false;
      }
      return true;
    });

    const sorted = [...base];
    if (sort === "price-asc") {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sort === "price-desc") {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sort === "year-desc") {
      sorted.sort((a, b) => b.year - a.year);
    } else if (sort === "popularity") {
      // Placeholder: keep backend order for popularity until a real signal exists.
    }
    return sorted;
  }, [listings, filters, sort]);

  const totalPages = Math.max(1, Math.ceil((totalCount ?? filtered.length) / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    if (totalCount !== undefined) {
      return listings;
    }
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, listings, safePage, totalCount, pageSize]);

  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries());
    const nextFilters: FilterState = {
      query: params.query ?? "",
      make: params.make ?? undefined,
      model: params.model ?? undefined,
      priceMin: params.priceMin ? Number(params.priceMin) : undefined,
      priceMax: params.priceMax ? Number(params.priceMax) : undefined,
      yearMin: params.yearMin ? Number(params.yearMin) : undefined,
      yearMax: params.yearMax ? Number(params.yearMax) : undefined,
      mileageMin: params.mileageMin ? Number(params.mileageMin) : undefined,
      mileageMax: params.mileageMax ? Number(params.mileageMax) : undefined,
      fuel: params.fuel
        ? (params.fuel.includes(",")
            ? (params.fuel.split(",").filter(Boolean) as FilterState["fuel"])
            : (params.fuel as FilterState["fuel"]))
        : undefined,
      transmission: params.transmission as FilterState["transmission"] | undefined,
      body: params.body
        ? (params.body.includes(",")
            ? (params.body.split(",").filter(Boolean) as FilterState["body"])
            : (params.body as FilterState["body"]))
        : undefined,
      drive: params.drive as FilterState["drive"] | undefined,
      sellerType: params.sellerType as Listing["sellerType"] | undefined,
      dealType: (params.dealType as FilterState["dealType"]) ?? undefined,
      verifiedOnly: params.verifiedOnly === "true" ? true : undefined,
      color: params.color ?? undefined,
      location: params.location ?? undefined,
      locationRadius: params.locationRadius ? Number(params.locationRadius) : undefined,
      doors: params.doors ? Number(params.doors) : undefined,
      seats: params.seats ? Number(params.seats) : undefined,
      powerMin: params.powerMin ? Number(params.powerMin) : undefined,
      powerMax: params.powerMax ? Number(params.powerMax) : undefined,
      category: params.category ?? undefined,
      features: params.features ? params.features.split(",").filter(Boolean) : undefined,
      evRangeMin: params.evRangeMin ? Number(params.evRangeMin) : undefined,
      evBatteryMin: params.evBatteryMin ? Number(params.evBatteryMin) : undefined,
      evFastChargeMin: params.evFastChargeMin ? Number(params.evFastChargeMin) : undefined,
      evChargeType: params.evChargeType ?? undefined,
      co2Min: params.co2Min ? Number(params.co2Min) : undefined,
      co2Max: params.co2Max ? Number(params.co2Max) : undefined,
      consumptionMin: params.consumptionMin ? Number(params.consumptionMin) : undefined,
      consumptionMax: params.consumptionMax ? Number(params.consumptionMax) : undefined
    };

    setFilters(nextFilters);
    setSort(params.sort ?? "relevance");
    setPage(params.page ? Number(params.page) : 1);
    setPowerMinInput(nextFilters.powerMin ? String(formatPower(nextFilters.powerMin, powerUnit)) : "");
    setPowerMaxInput(nextFilters.powerMax ? String(formatPower(nextFilters.powerMax, powerUnit)) : "");
  }, [searchParams]);

  useEffect(() => {
    const stored = window.localStorage.getItem("appocar_saved_searches");
    if (stored) {
      try {
        setSaved(JSON.parse(stored));
      } catch {
        setSaved([]);
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    api<{ items: any[] }>("/api/saved-searches")
      .then((res) => {
        if (Array.isArray(res.items) && res.items.length > 0) {
          setSaved(
            res.items.map((item) => ({
              id: item.id,
              label: item.label,
              params: item.params
            }))
          );
        }
      })
      .catch(() => undefined);
  }, [user]);

  useEffect(() => {
    window.localStorage.setItem("appocar_saved_searches", JSON.stringify(saved));
  }, [saved]);

  useEffect(() => {
    const key = searchParams.toString();
    if (!key) return;
    if (lastImpressionKey.current === key) return;
    lastImpressionKey.current = key;
    const count = totalCount ?? filtered.length;
    api("/api/analytics/event", {
      method: "POST",
      json: { type: "search_impression", meta: { params: key, count } }
    }).catch(() => undefined);
  }, [searchParams, totalCount, filtered.length]);

  useEffect(() => {
    setPowerMinInput(filters.powerMin ? String(formatPower(filters.powerMin, powerUnit)) : "");
    setPowerMaxInput(filters.powerMax ? String(formatPower(filters.powerMax, powerUnit)) : "");
  }, [powerUnit, filters.powerMin, filters.powerMax]);

  useEffect(() => {
    if (sidebarDropdown !== "location") return;
    if (!locationSearch) {
      setLocationSuggestions(
        POPULAR_LOCATIONS.map((label) => ({
          label,
          lat: 0,
          lng: 0
        }))
      );
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!base) {
          const filtered = POPULAR_LOCATIONS.filter((item) =>
            item.toLowerCase().includes(locationSearch.toLowerCase())
          );
          setLocationSuggestions(
            filtered.map((label) => ({
              label,
              lat: 0,
              lng: 0
            }))
          );
          return;
        }
        const res = await fetch(`${base}/api/geocode?q=${encodeURIComponent(locationSearch ?? "")}`);
        const data = await res.json();
        setLocationSuggestions(Array.isArray(data.items) ? data.items : []);
      } catch {
        setLocationSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [locationSearch, sidebarDropdown]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.query) next.set("query", filters.query);
    if (filters.make) next.set("make", filters.make);
    if (filters.model) next.set("model", filters.model);
    if (filters.priceMin) next.set("priceMin", String(filters.priceMin));
    if (filters.priceMax) next.set("priceMax", String(filters.priceMax));
    if (filters.yearMin) next.set("yearMin", String(filters.yearMin));
    if (filters.yearMax) next.set("yearMax", String(filters.yearMax));
    if (filters.mileageMin) next.set("mileageMin", String(filters.mileageMin));
    if (filters.mileageMax) next.set("mileageMax", String(filters.mileageMax));
    if (filters.fuel) next.set("fuel", Array.isArray(filters.fuel) ? filters.fuel.join(",") : filters.fuel);
    if (filters.transmission) next.set("transmission", filters.transmission);
    if (filters.body) next.set("body", Array.isArray(filters.body) ? filters.body.join(",") : filters.body);
    if (filters.drive) next.set("drive", filters.drive);
    if (filters.sellerType) next.set("sellerType", filters.sellerType);
    if (filters.dealType) next.set("dealType", filters.dealType);
    if (filters.verifiedOnly) next.set("verifiedOnly", "true");
    if (filters.color) next.set("color", filters.color);
    if (filters.location) next.set("location", filters.location);
    if (filters.locationRadius) next.set("locationRadius", String(filters.locationRadius));
    if (filters.doors) next.set("doors", String(filters.doors));
    if (filters.seats) next.set("seats", String(filters.seats));
    if (filters.powerMin) next.set("powerMin", String(filters.powerMin));
    if (filters.powerMax) next.set("powerMax", String(filters.powerMax));
    if (filters.category) next.set("category", filters.category);
    if (filters.features?.length) next.set("features", filters.features.join(","));
    if (filters.evRangeMin) next.set("evRangeMin", String(filters.evRangeMin));
    if (filters.evBatteryMin) next.set("evBatteryMin", String(filters.evBatteryMin));
    if (filters.evFastChargeMin) next.set("evFastChargeMin", String(filters.evFastChargeMin));
    if (filters.evChargeType) next.set("evChargeType", filters.evChargeType);
    if (filters.co2Min) next.set("co2Min", String(filters.co2Min));
    if (filters.co2Max) next.set("co2Max", String(filters.co2Max));
    if (filters.consumptionMin) next.set("consumptionMin", String(filters.consumptionMin));
    if (filters.consumptionMax) next.set("consumptionMax", String(filters.consumptionMax));
    if (sort && sort !== "relevance") next.set("sort", sort);
    if (page > 1) next.set("page", String(page));
    if (pageSize !== 12) next.set("pageSize", String(pageSize));
    router.replace(`/search?${next.toString()}`);
  }, [filters, sort, page, router]);

  return (
    <div className="search-layout">
      <aside className="glass filter-sidebar">
        <div className="filter-card__header">
          <div>
            <div className="card-title">{t("filters.title")}</div>
            <div className="muted">{t("filters.subtitle")}</div>
          </div>
          <button
            className="ghost"
            type="button"
            onClick={() => {
              setFilters({ query: "" });
              setPage(1);
            }}
          >
            {t("filters.reset")}
          </button>
        </div>
        <div className="filter-section">
          <div className="filter-section__title">{t("filters.quickTitle")}</div>
          <div className="filter-table" ref={sidebarRef}>
            <div className="filter-cell full">
              <label>{t("filters.queryLabel")}</label>
              <input
                className="input"
                placeholder={t("filters.queryPlaceholder")}
                value={filters.query}
                onChange={(event) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, query: event.target.value }));
                }}
              />
            </div>
            <div className="filter-cell">
              <label>{t("filters.makeModel")}</label>
              <button
                className={`filter-dropdown__toggle ${sidebarDropdown === "make" ? "open" : ""}`}
                type="button"
                onClick={() => setSidebarDropdown(sidebarDropdown === "make" ? null : "make")}
              >
                <span>
                  {filters.make ? `${filters.make}${filters.model ? ` · ${filters.model}` : ""}` : t("filters.makeModel")}
                </span>
                <ChevronDown />
              </button>
              {sidebarDropdown === "make" && (
                <div className="filter-dropdown__panel">
                  <input
                    className="input filter-dropdown__search"
                    placeholder={t("filters.make")}
                    value={makeSearch}
                    onChange={(event) => setMakeSearch(event.target.value)}
                  />
                  {!brandQuery && (
                    <div className="filter-dropdown__section">
                      <div className="filter-dropdown__section-title">{t("filters.topBrands")}</div>
                      <div className="filter-dropdown__list">
                        {topBrands.map((brand) => (
                          <button
                            key={brand}
                            type="button"
                            className={`filter-dropdown__option${filters.make === brand ? " active" : ""}`}
                            onClick={() => {
                              setPage(1);
                              setFilters((prev) => ({ ...prev, make: brand, model: undefined }));
                              setModelSearch("");
                            }}
                          >
                            <span>{brand}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="filter-dropdown__section">
                    <div className="filter-dropdown__section-title">{t("filters.allBrands")}</div>
                    <div className="filter-dropdown__list filter-dropdown__list--scroll">
                      {(brandQuery ? filteredBrands : brandOptions).map((brand) => (
                        <button
                          key={brand}
                          type="button"
                          className={`filter-dropdown__option${filters.make === brand ? " active" : ""}`}
                          onClick={() => {
                            setPage(1);
                            setFilters((prev) => ({ ...prev, make: brand, model: undefined }));
                            setMakeSearch("");
                            setModelSearch("");
                          }}
                        >
                          <span>{brand}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="filter-dropdown__section">
                    <div className="filter-dropdown__section-title">{t("filters.model")}</div>
                    <input
                      className="input filter-dropdown__search"
                      placeholder={t("filters.model")}
                      value={modelSearch}
                      onChange={(event) => setModelSearch(event.target.value)}
                      disabled={!filters.make}
                    />
                    {filters.make ? (
                      <div className="filter-dropdown__list filter-dropdown__list--scroll">
                        {filteredModels.length === 0 ? (
                          <div className="muted small">{t("filters.noResults")}</div>
                        ) : (
                          filteredModels.map((model) => (
                            <button
                              key={model}
                              type="button"
                              className={`filter-dropdown__option${filters.model === model ? " active" : ""}`}
                              onClick={() => {
                                setPage(1);
                                setFilters((prev) => ({ ...prev, model }));
                              }}
                            >
                              <span>{model}</span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : (
                      <div className="muted small">{t("filters.selectBrandFirst")}</div>
                    )}
                  </div>
                  <button className="filter-dropdown__apply" type="button" onClick={() => setSidebarDropdown(null)}>
                    {t("filters.apply")}
                  </button>
                </div>
              )}
            </div>
            <div className="filter-cell">
              <label>{t("filters.yearRange")}</label>
              <button
                className={`filter-dropdown__toggle ${sidebarDropdown === "year" ? "open" : ""}`}
                type="button"
                onClick={() => setSidebarDropdown(sidebarDropdown === "year" ? null : "year")}
              >
                <span>
                  {filters.yearMin || filters.yearMax
                    ? `${filters.yearMin ?? "—"} · ${filters.yearMax ?? "—"}`
                    : t("filters.yearRange")}
                </span>
                <ChevronDown />
              </button>
              {sidebarDropdown === "year" && (
                <div className="filter-dropdown__panel">
                  <div className="filter-row">
                    <select
                      className="input"
                      value={filters.yearMin ?? ""}
                      onChange={(event) => {
                        setPage(1);
                        setFilters((prev) => ({
                          ...prev,
                          yearMin: event.target.value ? Number(event.target.value) : undefined
                        }));
                      }}
                    >
                      <option value="">{t("filters.yearMin")}</option>
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input"
                      value={filters.yearMax ?? ""}
                      onChange={(event) => {
                        setPage(1);
                        setFilters((prev) => ({
                          ...prev,
                          yearMax: event.target.value ? Number(event.target.value) : undefined
                        }));
                      }}
                    >
                      <option value="">{t("filters.yearMax")}</option>
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="filter-dropdown__apply" type="button" onClick={() => setSidebarDropdown(null)}>
                    {t("filters.apply")}
                  </button>
                </div>
              )}
            </div>
            <div className="filter-cell">
              <label>{t("filters.priceRange")}</label>
              <button
                className={`filter-dropdown__toggle ${sidebarDropdown === "price" ? "open" : ""}`}
                type="button"
                onClick={() => setSidebarDropdown(sidebarDropdown === "price" ? null : "price")}
              >
                <span>
                  {filters.priceMin || filters.priceMax
                    ? `${filters.priceMin ?? "—"} · ${filters.priceMax ?? "—"}`
                    : t("filters.priceRange")}
                </span>
                <ChevronDown />
              </button>
              {sidebarDropdown === "price" && (
                <div className="filter-dropdown__panel">
                  <div className="filter-row">
                    <select
                      className="input"
                      value={filters.priceMin ?? ""}
                      onChange={(event) => {
                        setPage(1);
                        setFilters((prev) => ({
                          ...prev,
                          priceMin: event.target.value ? Number(event.target.value) : undefined
                        }));
                      }}
                    >
                      <option value="">{t("filters.minPrice")}</option>
                      {priceOptions.map((price) => (
                        <option key={price} value={price}>
                          {price === 0 ? "0" : price.toLocaleString()}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input"
                      value={filters.priceMax ?? ""}
                      onChange={(event) => {
                        setPage(1);
                        setFilters((prev) => ({
                          ...prev,
                          priceMax: event.target.value ? Number(event.target.value) : undefined
                        }));
                      }}
                    >
                      <option value="">{t("filters.maxPrice")}</option>
                      {priceOptions.map((price) => (
                        <option key={price} value={price}>
                          {price === 0 ? "0" : price.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="filter-dropdown__apply" type="button" onClick={() => setSidebarDropdown(null)}>
                    {t("filters.apply")}
                  </button>
                </div>
              )}
            </div>
            <div className="filter-cell">
              <label>{t("filters.fuel")}</label>
              <button
                className={`filter-dropdown__toggle ${sidebarDropdown === "fuel" ? "open" : ""}`}
                type="button"
                onClick={() => setSidebarDropdown(sidebarDropdown === "fuel" ? null : "fuel")}
              >
                <span>{fuelLabel}</span>
                <ChevronDown />
              </button>
              {sidebarDropdown === "fuel" && (
                <div className="filter-dropdown__panel">
                  <div className="filter-checkboxes">
                    {["Petrol", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric"].map((item) => {
                      const active = Array.isArray(filters.fuel)
                        ? filters.fuel.includes(item as Listing["fuel"])
                        : filters.fuel === item;
                      return (
                        <label key={item} className={active ? "checkbox-pill active" : "checkbox-pill"}>
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => {
                              setPage(1);
                              setFilters((prev) => ({
                                ...prev,
                                fuel: toggleArrayFilter(prev.fuel, item as Listing["fuel"])
                              }));
                            }}
                          />
                          <span>{t(`filters.${item === "Plug-in Hybrid" ? "plugInHybrid" : item.toLowerCase()}`)}</span>
                        </label>
                      );
                    })}
                  </div>
                  <button className="filter-dropdown__apply" type="button" onClick={() => setSidebarDropdown(null)}>
                    {t("filters.apply")}
                  </button>
                </div>
              )}
            </div>
            <div className="filter-cell">
              <label>{t("filters.transmission")}</label>
              <button
                className={`filter-dropdown__toggle ${sidebarDropdown === "transmission" ? "open" : ""}`}
                type="button"
                onClick={() => setSidebarDropdown(sidebarDropdown === "transmission" ? null : "transmission")}
              >
                <span>{filters.transmission ? t(`filters.${filters.transmission.toLowerCase()}`) : t("filters.transmission")}</span>
                <ChevronDown />
              </button>
              {sidebarDropdown === "transmission" && (
                <div className="filter-dropdown__panel">
                  <select
                    className="input"
                    value={filters.transmission ?? ""}
                    onChange={(event) => {
                      setPage(1);
                      setFilters((prev) => ({
                        ...prev,
                        transmission: event.target.value
                          ? (event.target.value as FilterState["transmission"])
                          : undefined
                      }));
                    }}
                  >
                    <option value="">{t("filters.transmission")}</option>
                    <option value="Automatic">{t("filters.automatic")}</option>
                    <option value="Manual">{t("filters.manual")}</option>
                  </select>
                  <button className="filter-dropdown__apply" type="button" onClick={() => setSidebarDropdown(null)}>
                    {t("filters.apply")}
                  </button>
                </div>
              )}
            </div>
            <div className="filter-cell full">
              <label>{t("filters.location")}</label>
              <button
                className={`filter-dropdown__toggle ${sidebarDropdown === "location" ? "open" : ""}`}
                type="button"
                onClick={() => setSidebarDropdown(sidebarDropdown === "location" ? null : "location")}
              >
                <span>{locationLabel}</span>
                <ChevronDown />
              </button>
              {sidebarDropdown === "location" && (
                <div className="filter-dropdown__panel">
                  <input
                    className="input filter-dropdown__search"
                    placeholder={t("filters.location")}
                    value={locationSearch}
                    onChange={(event) => setLocationSearch(event.target.value)}
                  />
                  <div className="filter-row">
                    <input
                      className="input"
                      placeholder={t("filters.radius")}
                      value={filters.locationRadius ?? ""}
                      onChange={(event) => {
                        setPage(1);
                        setFilters((prev) => ({
                          ...prev,
                          locationRadius: event.target.value ? Number(event.target.value) : undefined
                        }));
                      }}
                    />
                  </div>
                  <div className="filter-dropdown__list filter-dropdown__list--scroll">
                    {locationSuggestions.map((item) => {
                      const active = locationSelected.includes(item.label);
                      return (
                        <label key={item.label} className={`filter-dropdown__option${active ? " active" : ""}`}>
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => {
                              setLocationSelected((prev) => {
                                if (prev.includes(item.label)) {
                                  return prev.filter((entry) => entry !== item.label);
                                }
                                return [...prev, item.label];
                              });
                            }}
                          />
                          <span>{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <button
                    className="filter-dropdown__apply"
                    type="button"
                    onClick={() => {
                      const next = locationSelected.length
                        ? locationSelected
                        : locationSearch
                          ? [locationSearch]
                          : [];
                      setPage(1);
                      setFilters((prev) => ({
                        ...prev,
                        location: next.length ? next.join(", ") : undefined
                      }));
                      setSidebarDropdown(null);
                    }}
                  >
                    {t("filters.apply")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="filter-section">
          <div className="filter-section__title">{t("filters.paymentType")}</div>
          <div className="toggle-group">
            <button
              className={filters.dealType !== "leasing" ? "toggle active" : "toggle"}
              type="button"
              onClick={() => {
                setPage(1);
                setFilters((prev) => ({ ...prev, dealType: "buy" }));
              }}
            >
              {t("filters.buy")}
            </button>
            <button
              className={filters.dealType === "leasing" ? "toggle active" : "toggle"}
              type="button"
              onClick={() => {
                setPage(1);
                setFilters((prev) => ({ ...prev, dealType: "leasing" }));
              }}
            >
              {t("filters.leasing")}
            </button>
          </div>
          <label className="hero-search__check" style={{ marginTop: "0.6rem" }}>
            <input
              type="checkbox"
              checked={filters.verifiedOnly ?? false}
              onChange={(event) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, verifiedOnly: event.target.checked }));
              }}
            />
            <span>{t("filters.verifiedOnly")}</span>
          </label>
        </div>
        <div className="filter-section">
          <div className="filter-section__title">{t("filters.body")}</div>
          <div className="filter-checkboxes">
            {["Sedan", "SUV", "Hatchback", "Wagon", "Coupe", "Convertible"].map((item) => {
              const active = Array.isArray(filters.body)
                ? filters.body.includes(item as Listing["body"])
                : filters.body === item;
              return (
                <label key={item} className={active ? "checkbox-pill active" : "checkbox-pill"}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => {
                      setPage(1);
                      setFilters((prev) => ({
                        ...prev,
                        body: toggleArrayFilter(prev.body, item as Listing["body"])
                      }));
                    }}
                  />
                  <span>{t(`filters.${item.toLowerCase()}`)}</span>
                </label>
              );
            })}
          </div>
        </div>
        <button className="secondary" type="button" onClick={() => setAdvancedOpen(true)}>
          {t("filters.showAdvanced")}
        </button>
        <div className="filter-categories">
          <div className="card-title">{t("filters.savedTitle")}</div>
          <div className="filter-categories__list">
            {saved.length === 0 && <span className="muted">{t("filters.savedEmpty")}</span>}
            {saved.map((item) => (
              <button
                key={item.id}
                className="chip"
                onClick={() => router.push(`/search?${item.params}`)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            className="secondary"
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              const label = params.get("query") || t("filters.savedDefault");
              const payload = { id: String(Date.now()), label, params: params.toString() };
              setSaved((prev) => [payload, ...prev].slice(0, 10));
              if (user) {
                api("/api/saved-searches", {
                  method: "POST",
                  json: { label, params: params.toString() }
                }).catch(() => undefined);
              }
              api("/api/analytics/event", {
                method: "POST",
                json: { type: "saved_search", meta: { params: params.toString() } }
              }).catch(() => undefined);
              api("/api/history", {
                method: "POST",
                json: { action: "Saved search", meta: { params: params.toString() } }
              }).catch(() => undefined);
            }}
          >
            {t("filters.savedAction")}
          </button>
        </div>
      </aside>

      <section className="search-results">
        <div className="results-header">
          <div className="results-bar">
            <div className="muted">
              {t("search.results", { count: totalCount ?? filtered.length })}
            </div>
            <div className="results-bar__sort">
              <span className="muted">{t("search.sortBy")}</span>
              <select
                className="input"
                value={sort}
                onChange={(event) => {
                  setPage(1);
                  setSort(event.target.value);
                }}
              >
                <option value="popularity">{t("search.sortPopular")}</option>
                <option value="relevance">{t("search.sortRelevance")}</option>
                <option value="price-asc">{t("search.sortPriceAsc")}</option>
                <option value="price-desc">{t("search.sortPriceDesc")}</option>
                <option value="year-desc">{t("search.sortNewest")}</option>
              </select>
            </div>
          </div>
          <div className="results-categories">
            <div className="card-title">{t("home.categoriesTitle")}</div>
            <div className="results-categories__row">
              {categories.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`chip tab-pill${isCategoryActive(item.href) ? " active" : ""}`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
        {paged.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__title">{t("search.emptyTitle")}</div>
            <div className="muted">{t("search.emptyBody")}</div>
            <button
              className="secondary"
              onClick={() => {
                setFilters({ query: "" });
                setPage(1);
              }}
            >
              {t("filters.reset")}
            </button>
          </div>
        ) : (
          <div className="listing-grid">
            {paged.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
        <div className="pagination">
          <button
            className="secondary"
            disabled={safePage <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            {t("pagination.prev")}
          </button>
          <div className="muted">
            {t("pagination.page")} {safePage} / {totalPages}
          </div>
          <button
            className="secondary"
            disabled={safePage >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            {t("pagination.next")}
          </button>
        </div>
      </section>

      {advancedOpen && (
        <div className="advanced-modal">
          <div
            className="advanced-modal__backdrop"
            onClick={() => setAdvancedOpen(false)}
            role="button"
            tabIndex={-1}
          />
          <div className="advanced-modal__panel">
            <div className="advanced-modal__header">
              <div>
                <div className="section-title">{t("filters.advancedTitle")}</div>
                <div className="muted">{t("filters.advancedSubtitle")}</div>
              </div>
              <button className="icon-button" type="button" onClick={() => setAdvancedOpen(false)}>
                ✕
              </button>
            </div>
            <div className="advanced-tabs">
              {[
                { id: "basic", label: t("filters.tabBasic") },
                { id: "tech", label: t("filters.tabTech") },
                { id: "comfort", label: t("filters.tabComfort") },
                { id: "ev", label: t("filters.tabEv") },
                { id: "seller", label: t("filters.tabSeller") },
                { id: "other", label: t("filters.tabOther") }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={advancedTab === tab.id ? "advanced-tab active" : "advanced-tab"}
                  type="button"
                  onClick={() => setAdvancedTab(tab.id as typeof advancedTab)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="advanced-content">
              {advancedTab === "basic" && (
                <div className="advanced-grid">
                  <div className="filter-section">
                    <div className="filter-section__title">{t("filters.yearRange")}</div>
                    <div className="filter-row">
                      <input
                        className="input"
                        placeholder={t("filters.yearMin")}
                        type="number"
                        value={filters.yearMin ?? ""}
                        onChange={(event) => {
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            yearMin: event.target.value ? Number(event.target.value) : undefined
                          }));
                        }}
                      />
                      <input
                        className="input"
                        placeholder={t("filters.yearMax")}
                        type="number"
                        value={filters.yearMax ?? ""}
                        onChange={(event) => {
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            yearMax: event.target.value ? Number(event.target.value) : undefined
                          }));
                        }}
                      />
                    </div>
                  </div>
                  <div className="filter-section">
                    <div className="filter-section__title">{t("filters.priceRange")}</div>
                    <div className="filter-row">
                      <input
                        className="input"
                        placeholder={t("filters.minPrice")}
                        type="number"
                        value={filters.priceMin ?? ""}
                        onChange={(event) => {
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            priceMin: event.target.value ? Number(event.target.value) : undefined
                          }));
                        }}
                      />
                      <input
                        className="input"
                        placeholder={t("filters.maxPrice")}
                        type="number"
                        value={filters.priceMax ?? ""}
                        onChange={(event) => {
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            priceMax: event.target.value ? Number(event.target.value) : undefined
                          }));
                        }}
                      />
                    </div>
                  </div>
                  <div className="filter-section">
                    <div className="filter-section__title">{t("filters.specs")}</div>
                    <div className="filter-row">
                      <input
                        className="input"
                        placeholder={t("filters.minMileage")}
                        type="number"
                        value={filters.mileageMin ?? ""}
                        onChange={(event) => {
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            mileageMin: event.target.value ? Number(event.target.value) : undefined
                          }));
                        }}
                      />
                      <input
                        className="input"
                        placeholder={t("filters.maxMileage")}
                        type="number"
                        value={filters.mileageMax ?? ""}
                        onChange={(event) => {
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            mileageMax: event.target.value ? Number(event.target.value) : undefined
                          }));
                        }}
                      />
                      <input
                        className="input"
                        placeholder={t("filters.doors")}
                        type="number"
                        value={filters.doors ?? ""}
                        onChange={(event) => {
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            doors: event.target.value ? Number(event.target.value) : undefined
                          }));
                        }}
                      />
                      <input
                        className="input"
                        placeholder={t("filters.seats")}
                        type="number"
                        value={filters.seats ?? ""}
                        onChange={(event) => {
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            seats: event.target.value ? Number(event.target.value) : undefined
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {advancedTab === "tech" && (
                <div className="advanced-grid">
                  <div className="filter-section">
                    <div className="filter-section__title">{t("filters.power")}</div>
                    <div className="filter-row">
                      <input
                        className="input"
                        placeholder={`${t("filters.powerMin")} (${powerUnit})`}
                        type="number"
                        value={powerMinInput}
                        onChange={(event) => {
                          setPowerMinInput(event.target.value);
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            powerMin: event.target.value ? toKw(Number(event.target.value), powerUnit) : undefined
                          }));
                        }}
                      />
                      <input
                        className="input"
                        placeholder={`${t("filters.powerMax")} (${powerUnit})`}
                        type="number"
                        value={powerMaxInput}
                        onChange={(event) => {
                          setPowerMaxInput(event.target.value);
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            powerMax: event.target.value ? toKw(Number(event.target.value), powerUnit) : undefined
                          }));
                        }}
                      />
                    </div>
                    <div className="filter-toggle">
                      <span className="muted">{t("filters.powerUnit")}</span>
                      <div className="toggle-group">
                        <button
                          className={powerUnit === "kW" ? "toggle active" : "toggle"}
                          type="button"
                          onClick={() => setPowerUnit("kW")}
                        >
                          kW
                        </button>
                        <button
                          className={powerUnit === "HP" ? "toggle active" : "toggle"}
                          type="button"
                          onClick={() => setPowerUnit("HP")}
                        >
                          HP
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="filter-section">
                    <div className="filter-section__title">{t("filters.drive")}</div>
                    <div className="filter-row">
                      <select
                        className="input"
                        value={filters.drive ?? ""}
                        onChange={(event) => {
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            drive: event.target.value ? (event.target.value as Listing["drive"]) : undefined
                          }));
                        }}
                      >
                        <option value="">{t("filters.drive")}</option>
                        <option value="FWD">{t("filters.fwd")}</option>
                        <option value="RWD">{t("filters.rwd")}</option>
                        <option value="AWD">{t("filters.awd")}</option>
                      </select>
                      <select
                        className="input"
                        value={filters.transmission ?? ""}
                        onChange={(event) => {
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            transmission: event.target.value
                              ? (event.target.value as FilterState["transmission"])
                              : undefined
                          }));
                        }}
                      >
                        <option value="">{t("filters.transmission")}</option>
                        <option value="Automatic">{t("filters.automatic")}</option>
                        <option value="Manual">{t("filters.manual")}</option>
                      </select>
                    </div>
                  </div>
                  <div className="filter-section">
                    <div className="filter-section__title">{t("filters.co2")}</div>
                    <div className="filter-row">
                      <input
                        className="input"
                        placeholder={t("filters.co2Min")}
                        type="number"
                        value={filters.co2Min ?? ""}
                        onChange={(event) => {
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            co2Min: event.target.value ? Number(event.target.value) : undefined
                          }));
                        }}
                      />
                      <input
                        className="input"
                        placeholder={t("filters.co2Max")}
                        type="number"
                        value={filters.co2Max ?? ""}
                        onChange={(event) => {
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            co2Max: event.target.value ? Number(event.target.value) : undefined
                          }));
                        }}
                      />
                    </div>
                  </div>
                  <div className="filter-section">
                    <div className="filter-section__title">{t("filters.consumption")}</div>
                    <div className="filter-row">
                      <input
                        className="input"
                        placeholder={t("filters.consumptionMin")}
                        type="number"
                        value={filters.consumptionMin ?? ""}
                        onChange={(event) => {
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            consumptionMin: event.target.value ? Number(event.target.value) : undefined
                          }));
                        }}
                      />
                      <input
                        className="input"
                        placeholder={t("filters.consumptionMax")}
                        type="number"
                        value={filters.consumptionMax ?? ""}
                        onChange={(event) => {
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            consumptionMax: event.target.value ? Number(event.target.value) : undefined
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {advancedTab === "comfort" && (
                <div className="advanced-grid">
                  <div className="filter-section">
                    <div className="filter-section__title">{t("filters.features")}</div>
                    <div className="filter-checkboxes">
                      {["AC", "LED", "Camera", "Leather", "Navigation", "CarPlay", "Heated", "Panoramic", "ADAS"].map((item) => {
                        const active = filters.features?.includes(item) ?? false;
                        return (
                          <label key={item} className={active ? "checkbox-pill active" : "checkbox-pill"}>
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={(event) => {
                                setPage(1);
                                setFilters((prev) => {
                                  const next = new Set(prev.features ?? []);
                                  if (event.target.checked) next.add(item);
                                  else next.delete(item);
                                  return { ...prev, features: Array.from(next) };
                                });
                              }}
                            />
                            <span>{t(`filters.feature.${item}`)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {advancedTab === "ev" && (
                <div className="advanced-grid">
                  <div className="filter-section">
                    <div className="filter-section__title">{t("filters.fuel")}</div>
                    <div className="filter-checkboxes">
                      {["Electric", "Plug-in Hybrid", "Hybrid", "Petrol", "Diesel"].map((item) => {
                        const active = Array.isArray(filters.fuel)
                          ? filters.fuel.includes(item as Listing["fuel"])
                          : filters.fuel === item;
                        return (
                          <label key={item} className={active ? "checkbox-pill active" : "checkbox-pill"}>
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => {
                                setPage(1);
                                setFilters((prev) => ({
                                  ...prev,
                                  fuel: toggleArrayFilter(prev.fuel, item as Listing["fuel"])
                                }));
                              }}
                            />
                            <span>{t(`filters.${item === "Plug-in Hybrid" ? "plugInHybrid" : item.toLowerCase()}`)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="filter-section">
                    <div className="filter-section__title">{t("filters.evRangeMin")}</div>
                    <input
                      className="input"
                      placeholder={t("filters.evRangeMin")}
                      value={filters.evRangeMin ?? ""}
                      onChange={(event) => {
                        setPage(1);
                        setFilters((prev) => ({
                          ...prev,
                          evRangeMin: event.target.value ? Number(event.target.value) : undefined
                        }));
                      }}
                    />
                  </div>
                  <div className="filter-section">
                    <div className="filter-section__title">{t("filters.evChargeType")}</div>
                    <input
                      className="input"
                      placeholder={t("filters.evChargeType")}
                      value={filters.evChargeType ?? ""}
                      onChange={(event) => {
                        setPage(1);
                        setFilters((prev) => ({
                          ...prev,
                          evChargeType: event.target.value || undefined
                        }));
                      }}
                    />
                  </div>
                  <div className="filter-section">
                    <div className="filter-section__title">{t("filters.evFastChargeMin")}</div>
                    <input
                      className="input"
                      placeholder={t("filters.evFastChargeMin")}
                      value={filters.evFastChargeMin ?? ""}
                      onChange={(event) => {
                        setPage(1);
                        setFilters((prev) => ({
                          ...prev,
                          evFastChargeMin: event.target.value ? Number(event.target.value) : undefined
                        }));
                      }}
                    />
                  </div>
                  <div className="filter-section">
                    <div className="filter-section__title">{t("filters.evBatteryMin")}</div>
                    <input
                      className="input"
                      placeholder={t("filters.evBatteryMin")}
                      value={filters.evBatteryMin ?? ""}
                      onChange={(event) => {
                        setPage(1);
                        setFilters((prev) => ({
                          ...prev,
                          evBatteryMin: event.target.value ? Number(event.target.value) : undefined
                        }));
                      }}
                    />
                  </div>
                </div>
              )}
              {advancedTab === "seller" && (
                <div className="advanced-grid">
                  <div className="filter-section">
                    <div className="filter-section__title">{t("filters.sellerType")}</div>
                    <select
                      className="input"
                      value={filters.sellerType ?? ""}
                      onChange={(event) => {
                        setPage(1);
                        setFilters((prev) => ({
                          ...prev,
                          sellerType: event.target.value ? (event.target.value as Listing["sellerType"]) : undefined
                        }));
                      }}
                    >
                      <option value="">{t("filters.sellerType")}</option>
                      <option value="Dealer">{t("filters.dealer")}</option>
                      <option value="Private">{t("filters.private")}</option>
                    </select>
                  </div>
                  <div className="filter-section">
                    <div className="filter-section__title">{t("filters.verifiedOnly")}</div>
                    <label className="hero-search__check">
                      <input
                        type="checkbox"
                        checked={filters.verifiedOnly ?? false}
                        onChange={(event) => {
                          setPage(1);
                          setFilters((prev) => ({ ...prev, verifiedOnly: event.target.checked }));
                        }}
                      />
                      <span>{t("filters.verifiedOnly")}</span>
                    </label>
                  </div>
                </div>
              )}
              {advancedTab === "other" && (
                <div className="advanced-grid">
                  <div className="filter-section">
                    <div className="filter-section__title">{t("filters.color")}</div>
                    <input
                      className="input"
                      placeholder={t("filters.color")}
                      value={filters.color ?? ""}
                      onChange={(event) => {
                        setPage(1);
                        setFilters((prev) => ({ ...prev, color: event.target.value || undefined }));
                      }}
                    />
                  </div>
                  <div className="filter-section">
                    <div className="filter-section__title">{t("filters.body")}</div>
                    <div className="filter-checkboxes">
                      {["Sedan", "SUV", "Hatchback", "Wagon", "Coupe", "Convertible"].map((item) => {
                        const active = Array.isArray(filters.body)
                          ? filters.body.includes(item as Listing["body"])
                          : filters.body === item;
                        return (
                          <label key={item} className={active ? "checkbox-pill active" : "checkbox-pill"}>
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => {
                                setPage(1);
                                setFilters((prev) => ({
                                  ...prev,
                                  body: toggleArrayFilter(prev.body, item as Listing["body"])
                                }));
                              }}
                            />
                            <span>{t(`filters.${item.toLowerCase()}`)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="advanced-modal__footer">
              <button
                className="ghost"
                type="button"
                onClick={() => {
                  setFilters({ query: "" });
                  setPage(1);
                }}
              >
                {t("filters.reset")}
              </button>
              <button className="primary" type="button" onClick={() => setAdvancedOpen(false)}>
                {t("filters.apply")} • {totalCount ?? filtered.length}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function toKw(value: number, unit: "kW" | "HP") {
  if (Number.isNaN(value)) return 0;
  return unit === "HP" ? Math.round(value * 0.7457) : value;
}

function formatPower(value: number, unit: "kW" | "HP") {
  return unit === "HP" ? Math.round(value / 0.7457) : value;
}

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function parseConsumption(value?: string) {
  if (!value) return null;
  const match = value.match(/[\d.]+/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : null;
}
