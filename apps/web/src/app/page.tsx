"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { mockListings } from "@appocar/shared";
import { ListingCard } from "@/components/ListingCard";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/components/I18nProvider";
import { api } from "@/lib/api";
import { BRANDS, fetchBrandsFromBackend, fetchModelsFromBackend } from "@/lib/brands";

export default function HomePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [aiQuery, setAiQuery] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState("");
  const [dealType, setDealType] = useState<"buy" | "leasing">("buy");
  const [electricOnly, setElectricOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [offerCount, setOfferCount] = useState<number | null>(null);
  const [featuredListings, setFeaturedListings] = useState(mockListings.slice(0, 3));
  const [brandOptions, setBrandOptions] = useState(BRANDS);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<
    null | "make" | "year" | "price" | "region" | "fuel" | "transmission"
  >(null);
  const [brandSearch, setBrandSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [regionDraft, setRegionDraft] = useState<string[]>([]);
  const [regionSelection, setRegionSelection] = useState<string[]>([]);
  const [fuelDraft, setFuelDraft] = useState<string[]>([]);
  const [fuelSelection, setFuelSelection] = useState<string[]>([]);
  const [transmissionDraft, setTransmissionDraft] = useState<string | null>(null);
  const [transmissionSelection, setTransmissionSelection] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchBrandsFromBackend().then(setBrandOptions);
  }, []);

  useEffect(() => {
    fetchModelsFromBackend(make).then(setModelOptions);
  }, [make]);

  useEffect(() => {
    setModelSearch("");
  }, [make]);

  useEffect(() => {
    if (!openDropdown) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setOpenDropdown(null);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [openDropdown]);

  useEffect(() => {
    if (openDropdown === "fuel") {
      setFuelDraft(fuelSelection);
    }
    if (openDropdown === "transmission") {
      setTransmissionDraft(transmissionSelection);
    }
    if (openDropdown === "region") {
      setRegionDraft(regionSelection);
    }
  }, [openDropdown, fuelSelection, transmissionSelection, location]);

  useEffect(() => {
    if (!electricOnly) {
      setFuelSelection((prev) => prev.filter((item) => item !== "Electric"));
      return;
    }
    setFuelSelection((prev) => (prev.includes("Electric") ? prev : [...prev, "Electric"]));
  }, [electricOnly]);

  useEffect(() => {
    setLocation(regionSelection.join(", "));
  }, [regionSelection]);

  const runSearch = () => {
    const params = new URLSearchParams();
    const query = aiQuery || [make, model].filter(Boolean).join(" ");
    if (make) params.set("make", make);
    if (model) params.set("model", model);
    if (query) params.set("query", query);
    if (yearFrom) params.set("yearMin", yearFrom);
    if (yearTo) params.set("yearMax", yearTo);
    if (priceFrom) params.set("priceMin", priceFrom);
    if (priceTo) params.set("priceMax", priceTo);
    if (location) params.set("location", location);
    if (radius) params.set("locationRadius", radius);
    if (fuelSelection.length > 0) params.set("fuel", fuelSelection.join(","));
    else if (electricOnly) params.set("fuel", "Electric");
    if (transmissionSelection) params.set("transmission", transmissionSelection);
    if (verifiedOnly) params.set("verifiedOnly", "true");
    if (dealType) params.set("dealType", dealType);
    router.push(`/search?${params.toString()}`);
  };

  const resetFilters = () => {
    setAiQuery("");
    setMake("");
    setModel("");
    setYearFrom("");
    setYearTo("");
    setPriceFrom("");
    setPriceTo("");
    setLocation("");
    setRadius("");
    setRegionSelection([]);
    setRegionDraft([]);
    setDealType("buy");
    setElectricOnly(false);
    setVerifiedOnly(false);
    setFuelSelection([]);
    setTransmissionSelection(null);
  };

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    const query = aiQuery || [make, model].filter(Boolean).join(" ");
    if (make) params.set("make", make);
    if (model) params.set("model", model);
    if (query) params.set("query", query);
    if (yearFrom) params.set("yearMin", yearFrom);
    if (yearTo) params.set("yearMax", yearTo);
    if (priceFrom) params.set("priceMin", priceFrom);
    if (priceTo) params.set("priceMax", priceTo);
    if (location) params.set("location", location);
    if (radius) params.set("locationRadius", radius);
    if (fuelSelection.length > 0) params.set("fuel", fuelSelection.join(","));
    else if (electricOnly) params.set("fuel", "Electric");
    if (transmissionSelection) params.set("transmission", transmissionSelection);
    if (verifiedOnly) params.set("verifiedOnly", "true");
    if (dealType) params.set("dealType", dealType);
    return params;
  }, [
    aiQuery,
    make,
    model,
    yearFrom,
    yearTo,
    priceFrom,
    priceTo,
    location,
    radius,
    fuelSelection,
    electricOnly,
    transmissionSelection,
    verifiedOnly,
    dealType
  ]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: current - 1989 }, (_, index) => String(current - index));
  }, []);

  const priceSteps = useMemo(
    () => [5000, 10000, 15000, 20000, 30000, 40000, 50000, 75000, 100000],
    []
  );

  const regionOptions = [
    "Praha",
    "Brno",
    "Ostrava",
    "Bratislava",
    "Vienna",
    "Berlin",
    "Munich",
    "Warsaw",
    "Krakow",
    "Paris"
  ];

  const topBrands = brandOptions.slice(0, 10);
  const filteredBrands = brandOptions.filter((brand) =>
    brand.toLowerCase().includes(brandSearch.toLowerCase())
  );
  const filteredModels = modelOptions.filter((item) =>
    item.toLowerCase().includes(modelSearch.toLowerCase())
  );

  const toggleRegion = (value: string) => {
    setRegionDraft((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const regionLabel = regionSelection.length === 0
    ? t("filters.location")
    : regionSelection.length === 1
      ? regionSelection[0]
      : `${regionSelection[0]} +${regionSelection.length - 1}`;

  useEffect(() => {
    const handle = setTimeout(async () => {
      try {
        const res = await api<{ count: number }>(`/api/listings?${searchParams.toString()}&page=1&pageSize=1`);
        setOfferCount(typeof res.count === "number" ? res.count : null);
      } catch {
        setOfferCount(null);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [searchParams]);

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const res = await api<{ items: any[] }>("/api/listings?page=1&pageSize=3");
        if (Array.isArray(res.items) && res.items.length > 0) {
          setFeaturedListings(
            res.items.map((item) => ({
              id: item.id,
              title: item.title,
              price: Number(item.price),
              currency: item.currency,
              year: item.year,
              mileageKm: item.mileage_km ?? item.mileageKm ?? 0,
              fuel: item.fuel,
              transmission: item.transmission,
              powerKw: item.power_kw ?? item.powerKw ?? 0,
              location: item.location,
              images: item.images,
              sellerName: item.seller_name ?? item.sellerName ?? "",
              sellerEmail: item.seller_email ?? item.sellerEmail ?? undefined,
              sellerType: item.seller_type ?? item.sellerType ?? "Dealer",
              createdAt: item.created_at ?? item.createdAt ?? new Date().toISOString(),
              body: item.body,
              color: item.color,
              drive: item.drive,
              doors: item.doors,
              seats: item.seats,
              description: item.description,
              features: item.features ?? []
            }))
          );
        }
      } catch {
        setFeaturedListings(mockListings.slice(0, 3));
      }
    };
    loadFeatured();
  }, []);

  const categoryItems = [
    { href: "/search?category=Cars", label: t("category.cars"), icon: "car" },
    { href: "/search?category=Vans", label: t("category.vans"), icon: "van" },
    { href: "/search?fuel=Electric", label: t("category.electric"), icon: "electric" },
    { href: "/search?body=SUV", label: t("category.suv"), icon: "suv" },
    { href: "/search?body=Wagon", label: t("category.wagon"), icon: "wagon" },
    { href: "/search?body=Sedan", label: t("category.sedan"), icon: "sedan" },
    { href: "/search?category=Luxury", label: t("category.luxury"), icon: "lux" },
    { href: "/search?category=Deals", label: t("category.deals"), icon: "deals" },
    { href: "/search?category=Leasing", label: t("category.leasing"), icon: "leasing" }
  ];

  return (
    <AppShell active="/">
      {/* HERO: Mobile.de-style hero with background media and dominant search */}
      <section className="hero-banner">
        <div className="hero-overlay">
          <div className="home-hero">
            <div className="home-hero__copy">
              <div className="home-hero__badge">
                <Logo size={22} />
                <span><HomeText id="home.heroBadge" /></span>
              </div>
              <h1 className="home-hero__title"><HomeText id="home.heroTitle" /></h1>
              <p className="home-hero__subtitle"><HomeText id="home.heroSubtitle" /></p>
              <div className="hero-meta"><HomeText id="home.heroMeta" /></div>
            </div>
            <div className="home-hero__search">
              <div className="home-search__title"><HomeText id="home.searchTitle" /></div>
              <div className="search-board search-board--auto">
                <div className="search-board__ai">
                  <span className="search-board__ai-badge">AppoAI</span>
                  <input
                    className="search-board__ai-input"
                    placeholder={t("home.searchAiPlaceholder")}
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                  />
                  <button className="search-board__ai-button" onClick={runSearch} aria-label={t("home.searchAction")}>
                    →
                  </button>
                </div>
                <div className="search-board__hint">{t("home.searchHint")}</div>
                <div className="search-board__table auto-filters" ref={dropdownRef}>
                  <div className="search-board__row">
                    <div className="search-board__field auto-field">
                      <label>{t("home.searchMake")}</label>
                      <button
                        type="button"
                        className={`auto-select ${openDropdown === "make" ? "open" : ""}`}
                        onClick={() => setOpenDropdown(openDropdown === "make" ? null : "make")}
                      >
                        <span>{make ? `${make}${model ? ` · ${model}` : ""}` : t("home.searchMake")}</span>
                        <ChevronDown />
                      </button>
                      {openDropdown === "make" && (
                        <div className="auto-panel">
                          <div className="auto-panel__search">
                            <input
                              className="input"
                              placeholder={t("filters.queryPlaceholder")}
                              value={brandSearch}
                              onChange={(event) => setBrandSearch(event.target.value)}
                            />
                          </div>
                          <div className="auto-panel__grid">
                            <div>
                              <div className="auto-panel__title">{t("filters.topBrands")}</div>
                              <div className="auto-panel__list">
                                {topBrands.map((brand) => (
                                  <button
                                    key={brand}
                                    type="button"
                                    className={`auto-option ${make === brand ? "active" : ""}`}
                                    onClick={() => {
                                      setMake(brand);
                                      setModel("");
                                    }}
                                  >
                                    {brand}
                                  </button>
                                ))}
                              </div>
                              <div className="auto-panel__title">{t("filters.allBrands")}</div>
                              <div className="auto-panel__list">
                                {filteredBrands.map((brand) => (
                                  <button
                                    key={brand}
                                    type="button"
                                    className={`auto-option ${make === brand ? "active" : ""}`}
                                    onClick={() => {
                                      setMake(brand);
                                      setModel("");
                                    }}
                                  >
                                    {brand}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="auto-panel__title">{t("filters.models")}</div>
                              <input
                                className="input auto-panel__search-input"
                                placeholder={t("filters.model")}
                                value={modelSearch}
                                onChange={(event) => setModelSearch(event.target.value)}
                              />
                              <div className="auto-panel__list">
                                {make ? (
                                  <>
                                    <button
                                      type="button"
                                      className={`auto-option ${model === "" ? "active" : ""}`}
                                      onClick={() => {
                                        setModel("");
                                        setOpenDropdown(null);
                                      }}
                                    >
                                      {t("filters.allModels")}
                                    </button>
                                    {filteredModels.map((item) => (
                                      <button
                                        key={item}
                                        type="button"
                                        className={`auto-option ${model === item ? "active" : ""}`}
                                        onClick={() => {
                                          setModel(item);
                                          setOpenDropdown(null);
                                        }}
                                      >
                                        {item}
                                      </button>
                                    ))}
                                  </>
                                ) : (
                                  <div className="muted">{t("filters.selectBrandFirst")}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="search-board__field auto-field">
                      <label>{t("home.searchYear")}</label>
                      <button
                        type="button"
                        className={`auto-select ${openDropdown === "year" ? "open" : ""}`}
                        onClick={() => setOpenDropdown(openDropdown === "year" ? null : "year")}
                      >
                        <span>
                          {yearFrom || yearTo ? `${yearFrom || "—"} · ${yearTo || "—"}` : t("home.searchYear")}
                        </span>
                        <ChevronDown />
                      </button>
                      {openDropdown === "year" && (
                        <div className="auto-panel auto-panel--columns">
                          <div>
                            <div className="auto-panel__title">{t("home.searchYear")}</div>
                            <div className="auto-panel__list">
                              {years.map((item) => (
                                <button
                                  key={item}
                                  type="button"
                                  className={`auto-option ${yearFrom === item ? "active" : ""}`}
                                  onClick={() => setYearFrom(item)}
                                >
                                  {item}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="auto-panel__title">{t("home.searchYearMax")}</div>
                            <div className="auto-panel__list">
                              {years.map((item) => (
                                <button
                                  key={item}
                                  type="button"
                                  className={`auto-option ${yearTo === item ? "active" : ""}`}
                                  onClick={() => setYearTo(item)}
                                >
                                  {item}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="auto-panel__apply"
                            onClick={() => setOpenDropdown(null)}
                          >
                            {t("filters.apply")}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="search-board__field auto-field">
                      <label>{t("filters.priceRange")}</label>
                      <button
                        type="button"
                        className={`auto-select ${openDropdown === "price" ? "open" : ""}`}
                        onClick={() => setOpenDropdown(openDropdown === "price" ? null : "price")}
                      >
                        <span>
                          {priceFrom || priceTo ? `${priceFrom || "—"} · ${priceTo || "—"}` : t("filters.priceRange")}
                        </span>
                        <ChevronDown />
                      </button>
                      {openDropdown === "price" && (
                        <div className="auto-panel auto-panel--columns">
                          <div>
                            <div className="auto-panel__title">{t("filters.minPrice")}</div>
                            <div className="auto-panel__list">
                              {priceSteps.map((item) => (
                                <button
                                  key={item}
                                  type="button"
                                  className={`auto-option ${priceFrom === String(item) ? "active" : ""}`}
                                  onClick={() => setPriceFrom(String(item))}
                                >
                                  €{item.toLocaleString()}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="auto-panel__title">{t("filters.maxPrice")}</div>
                            <div className="auto-panel__list">
                              {priceSteps.map((item) => (
                                <button
                                  key={item}
                                  type="button"
                                  className={`auto-option ${priceTo === String(item) ? "active" : ""}`}
                                  onClick={() => setPriceTo(String(item))}
                                >
                                  €{item.toLocaleString()}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="auto-panel__apply"
                            onClick={() => setOpenDropdown(null)}
                          >
                            {t("filters.apply")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="search-board__row">
                    <div className="search-board__field auto-field">
                      <label>{t("filters.location")}</label>
                      <button
                        type="button"
                        className={`auto-select ${openDropdown === "region" ? "open" : ""}`}
                        onClick={() => setOpenDropdown(openDropdown === "region" ? null : "region")}
                      >
                        <span>{regionLabel}</span>
                        <ChevronDown />
                      </button>
                      {openDropdown === "region" && (
                        <div className="auto-panel">
                          <div className="auto-panel__list">
                            {regionOptions.map((item) => (
                              <label key={item} className="auto-check">
                                <input
                                  type="checkbox"
                                  checked={regionDraft.includes(item)}
                                  onChange={() => toggleRegion(item)}
                                />
                                <span>{item}</span>
                              </label>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="auto-panel__apply"
                            onClick={() => {
                              setRegionSelection(regionDraft);
                              setLocation(regionDraft.join(", "));
                              setOpenDropdown(null);
                            }}
                          >
                            {t("filters.apply")}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="search-board__field auto-field">
                      <label>{t("filters.fuel")}</label>
                      <button
                        type="button"
                        className={`auto-select ${openDropdown === "fuel" ? "open" : ""}`}
                        onClick={() => setOpenDropdown(openDropdown === "fuel" ? null : "fuel")}
                      >
                        <span>
                          {fuelSelection.length > 0 ? fuelSelection.join(", ") : t("filters.fuel")}
                        </span>
                        <ChevronDown />
                      </button>
                      {openDropdown === "fuel" && (
                        <div className="auto-panel">
                          <div className="auto-panel__list">
                            {["Petrol", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric"].map((item) => (
                              <label key={item} className="auto-check">
                                <input
                                  type="checkbox"
                                  checked={fuelDraft.includes(item)}
                                  onChange={() => {
                                    setFuelDraft((prev) =>
                                      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
                                    );
                                  }}
                                />
                                <span>{t(`filters.${item === "Plug-in Hybrid" ? "plugInHybrid" : item.toLowerCase()}`)}</span>
                              </label>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="auto-panel__apply"
                            onClick={() => {
                              setFuelSelection(fuelDraft);
                              setOpenDropdown(null);
                            }}
                          >
                            {t("filters.apply")}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="search-board__field auto-field">
                      <label>{t("filters.transmission")}</label>
                      <button
                        type="button"
                        className={`auto-select ${openDropdown === "transmission" ? "open" : ""}`}
                        onClick={() => setOpenDropdown(openDropdown === "transmission" ? null : "transmission")}
                      >
                        <span>{transmissionSelection ?? t("filters.transmission")}</span>
                        <ChevronDown />
                      </button>
                      {openDropdown === "transmission" && (
                        <div className="auto-panel">
                          <div className="auto-panel__list">
                            {["Automatic", "Manual"].map((item) => (
                              <label key={item} className="auto-check">
                                <input
                                  type="radio"
                                  checked={transmissionDraft === item}
                                  onChange={() => setTransmissionDraft(item)}
                                />
                                <span>{t(`filters.${item.toLowerCase()}`)}</span>
                              </label>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="auto-panel__apply"
                            onClick={() => {
                              setTransmissionSelection(transmissionDraft);
                              setOpenDropdown(null);
                            }}
                          >
                            {t("filters.apply")}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="search-board__field search-board__field--cta">
                      <label aria-hidden="true">&nbsp;</label>
                      <button className="primary" onClick={runSearch}>
                        {offerCount !== null ? `${offerCount.toLocaleString()} ${t("home.offers")}` : t("home.searchAction")}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="search-board__payment">
                  <div className="search-board__payment-label">{t("home.paymentType")}</div>
                  <div className="hero-search__toggle">
                    <button
                      className={dealType === "buy" ? "toggle active" : "toggle"}
                      type="button"
                      onClick={() => setDealType("buy")}
                    >
                      {t("home.buy")}
                    </button>
                    <button
                      className={dealType === "leasing" ? "toggle active" : "toggle"}
                      type="button"
                      onClick={() => setDealType("leasing")}
                    >
                      {t("home.leasing")}
                    </button>
                  </div>
                </div>
                <div className="search-board__footer">
                  <div className="search-board__flags">
                    <label className="hero-search__check">
                      <input
                        type="checkbox"
                        checked={electricOnly}
                        onChange={(event) => setElectricOnly(event.target.checked)}
                      />
                      <span>{t("home.onlyElectric")}</span>
                    </label>
                    <label className="hero-search__check">
                      <input
                        type="checkbox"
                        checked={verifiedOnly}
                        onChange={(event) => setVerifiedOnly(event.target.checked)}
                      />
                      <span>{t("home.onlyVerified")}</span>
                    </label>
                  </div>
                  <div className="search-board__links">
                    <button className="link link--ghost" type="button" onClick={resetFilters}>
                      {t("filters.reset")}
                    </button>
                    <Link href="/search" className="link link--outline">
                      <HomeText id="home.searchAdvanced" />
                    </Link>
                  </div>
                </div>
              </div>
              <div className="home-search__pills">
                <Link href="/search?fuel=Electric" className="chip">{t("chip.electric")}</Link>
                <Link href="/search?body=SUV" className="chip">{t("chip.suv")}</Link>
                <Link href="/search?category=Family" className="chip">{t("chip.family")}</Link>
                <Link href="/search?category=Leasing" className="chip">{t("chip.leasing")}</Link>
                <Link href="/search?locationRadius=500" className="chip">{t("chip.radius")}</Link>
                <Link href="/search?category=Germany" className="chip">{t("chip.germany")}</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-categories">
        <div className="home-categories__title">{t("nav.categories")}</div>
        <div className="home-categories__scroll">
          {categoryItems.map((item) => (
            <Link key={item.href} href={item.href} className="home-category-chip">
              <CategoryIcon type={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
          <button className="home-category-chip add" type="button">
            <PlusIcon />
            <span>{t("header.addCategory")}</span>
          </button>
          <Link href="/search" className="home-category-chip all">
            {t("category.all")}
          </Link>
        </div>
      </section>

      {/* TRUST STATS: flatter, less card heavy */}
      <section className="home-stats">
        <HomeStat value="1 000 000+" labelId="kpi.listings" />
        <HomeStat value="98%" labelId="kpi.response" />
        <HomeStat value="€399" labelId="kpi.delivery" />
      </section>

      <section className="home-trust">
        <TrustBadge labelId="trust.vin" />
        <TrustBadge labelId="trust.return" />
        <TrustBadge labelId="trust.payments" />
        <TrustBadge labelId="trust.delivery" />
      </section>

      <section className="grid" style={{ gap: "1.2rem" }}>
        <div className="section-header">
          <h2 className="section-title"><HomeText id="section.featured" /></h2>
          <Link href="/search" className="secondary">
            <HomeText id="section.viewAll" />
          </Link>
        </div>
        <div className="listing-grid">
          {featuredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function HomeStat({ value, labelId }: { value: string; labelId: string }) {
  return (
    <div className="home-stats__item">
      <div className="home-stats__value">{value}</div>
      <div className="muted"><HomeText id={labelId} /></div>
    </div>
  );
}

function HomeText({ id }: { id: string }) {
  const { t } = useI18n();
  return <>{t(id)}</>;
}

function TrustBadge({ labelId }: { labelId: string }) {
  return (
    <div className="trust-badge">
      <div className="trust-badge__icon">✓</div>
      <div className="muted"><HomeText id={labelId} /></div>
    </div>
  );
}

function CategoryIcon({ type }: { type: string }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8 };
  if (type === "car") {
    return <svg {...common}><path d="M3 14h18l-2-6H5l-2 6Z" /><path d="M6 14v3" /><path d="M18 14v3" /></svg>;
  }
  if (type === "suv") {
    return <svg {...common}><path d="M3 14h18l-2-6H5l-2 6Z" /><path d="M6 14v3" /><path d="M18 14v3" /></svg>;
  }
  if (type === "sedan") {
    return <svg {...common}><path d="M4 13h16l-2-5H6l-2 5Z" /><path d="M6 13v3" /><path d="M18 13v3" /></svg>;
  }
  if (type === "wagon") {
    return <svg {...common}><path d="M3 14h18l-2-6H6l-3 6Z" /><path d="M7 14v3" /><path d="M18 14v3" /></svg>;
  }
  if (type === "electric") {
    return <svg {...common}><path d="M13 2 6 13h6l-1 9 7-11h-6l1-9Z" /></svg>;
  }
  if (type === "lux") {
    return <svg {...common}><path d="M4 18h16l-2-7H6l-2 7Z" /><path d="M9 11 12 6l3 5" /></svg>;
  }
  if (type === "van") {
    return <svg {...common}><rect x="4" y="8" width="16" height="8" rx="2" /><path d="M6 16v2" /><path d="M18 16v2" /></svg>;
  }
  if (type === "leasing") {
    return <svg {...common}><path d="M4 12h16" /><path d="M12 4v16" /></svg>;
  }
  if (type === "deals") {
    return <svg {...common}><path d="M4 7h16l-2 10H6L4 7Z" /><path d="M9 10h6" /></svg>;
  }
  return <svg {...common}><path d="M5 12h14" /></svg>;
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
