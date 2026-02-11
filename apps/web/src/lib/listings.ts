import type { FilterState, Listing } from "@appocar/shared";
import { mockListings, supabase } from "@appocar/shared";

type ListingRecord = {
  id: string;
  seller_id?: string | null;
  title: string;
  price: number;
  currency: string;
  year: number;
  mileage_km: number;
  fuel: Listing["fuel"];
  transmission: Listing["transmission"];
  power_kw: number;
  deal_type?: Listing["dealType"];
  verified?: boolean | null;
  co2_g_km?: number | null;
  consumption?: string | null;
  ev_range_km?: number | null;
  ev_battery_kwh?: number | null;
  ev_fast_charge_kw?: number | null;
  ev_charge_type?: string | null;
  location: string;
  images: string[];
  seller_name: string;
  seller_email?: string | null;
  seller_type: Listing["sellerType"];
  created_at: string;
  body: Listing["body"];
  color: string;
  drive: Listing["drive"];
  doors: number;
  seats: number;
  description: string;
  features: string[];
  phone?: string | null;
  whatsapp?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export async function getListings(filters?: FilterState): Promise<Listing[]> {
  const backendResult = await getListingsFromBackend(filters);
  if (backendResult.items.length > 0) {
    return backendResult.items;
  }
  return getListingsFromStore(filters);
}

export async function getListing(id: string): Promise<Listing | null> {
  const backendResult = await getListingsFromBackend();
  if (backendResult.items.length > 0) {
    return backendResult.items.find((item) => item.id === id) || null;
  }

  if (!supabase) {
    return mockListings.find((listing) => listing.id === id) || null;
  }

  const { data } = await supabase.from("listings").select("*").eq("id", id).single();
  return data ? mapListing(data as ListingRecord) : null;
}

type BackendListingsResult = { items: Listing[]; count?: number };

export async function getListingsWithMeta(
  filters?: FilterState,
  opts?: { page?: number; pageSize?: number }
): Promise<BackendListingsResult> {
  const backendResult = await getListingsFromBackend(filters, opts);
  if (backendResult.items.length > 0) {
    return backendResult;
  }
  const items = await getListingsFromStore(filters);
  return { items, count: items.length };
}

export async function getSimilarListings(current: Listing): Promise<Listing[]> {
  const items = await getListings();
  return items
    .filter((item) => item.id !== current.id)
    .filter((item) => item.body === current.body || item.fuel === current.fuel)
    .slice(0, 4);
}

async function getListingsFromBackend(
  filters?: FilterState,
  opts?: { page?: number; pageSize?: number }
): Promise<BackendListingsResult> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return { items: [] };

  try {
    const query = new URLSearchParams();
    if (filters?.query) query.set("query", filters.query);
    if (filters?.make) query.set("make", filters.make);
    if (filters?.model) query.set("model", filters.model);
    if (filters?.sort) query.set("sort", filters.sort);
    if (filters?.priceMin) query.set("priceMin", String(filters.priceMin));
    if (filters?.priceMax) query.set("priceMax", String(filters.priceMax));
    if (filters?.yearMin) query.set("yearMin", String(filters.yearMin));
    if (filters?.yearMax) query.set("yearMax", String(filters.yearMax));
  if (filters?.mileageMin) query.set("mileageMin", String(filters.mileageMin));
  if (filters?.mileageMax) query.set("mileageMax", String(filters.mileageMax));
  if (filters?.fuel) query.set("fuel", Array.isArray(filters.fuel) ? filters.fuel.join(",") : filters.fuel);
  if (filters?.transmission) query.set("transmission", filters.transmission);
  if (filters?.body) query.set("body", Array.isArray(filters.body) ? filters.body.join(",") : filters.body);
    if (filters?.drive) query.set("drive", filters.drive);
    if (filters?.sellerType) query.set("sellerType", filters.sellerType);
    if (filters?.dealType) query.set("dealType", filters.dealType);
    if (filters?.verifiedOnly) query.set("verifiedOnly", "true");
    if (filters?.color) query.set("color", filters.color);
    if (filters?.location) query.set("location", filters.location);
    if (filters?.locationRadius) query.set("locationRadius", String(filters.locationRadius));
    if (filters?.doors) query.set("doors", String(filters.doors));
    if (filters?.seats) query.set("seats", String(filters.seats));
    if (filters?.powerMin) query.set("powerMin", String(filters.powerMin));
    if (filters?.powerMax) query.set("powerMax", String(filters.powerMax));
    if (filters?.evRangeMin) query.set("evRangeMin", String(filters.evRangeMin));
    if (filters?.evBatteryMin) query.set("evBatteryMin", String(filters.evBatteryMin));
    if (filters?.evFastChargeMin) query.set("evFastChargeMin", String(filters.evFastChargeMin));
    if (filters?.evChargeType) query.set("evChargeType", filters.evChargeType);
    if (filters?.co2Min) query.set("co2Min", String(filters.co2Min));
    if (filters?.co2Max) query.set("co2Max", String(filters.co2Max));
    if (filters?.consumptionMin) query.set("consumptionMin", String(filters.consumptionMin));
    if (filters?.consumptionMax) query.set("consumptionMax", String(filters.consumptionMax));
    if (filters?.category) query.set("category", filters.category);
    if (filters?.features?.length) query.set("features", filters.features.join(","));
  if (opts?.page) query.set("page", String(opts.page));
  if (opts?.pageSize) query.set("pageSize", String(opts.pageSize));

    const res = await fetch(`${baseUrl}/api/listings${query.toString() ? `?${query}` : ""}`, {
      cache: "no-store"
    });
    if (!res.ok) return { items: [] };

    const payload = await res.json();
    const items = Array.isArray(payload) ? payload : payload.items;
    if (!Array.isArray(items)) return { items: [] };

    const mapped = items.map(mapBackendListing).filter(Boolean) as Listing[];
    const count = typeof payload?.count === "number" ? payload.count : mapped.length;
    return { items: mapped, count };
  } catch {
    return { items: [] };
  }
}

async function getListingsFromStore(filters?: FilterState): Promise<Listing[]> {
  if (!supabase) {
    return applyFilters(mockListings, filters);
  }

  const query = supabase.from("listings").select("*");
  if (filters?.priceMin) query.gte("price", filters.priceMin);
  if (filters?.priceMax) query.lte("price", filters.priceMax);
  if (filters?.yearMin) query.gte("year", filters.yearMin);
  if (filters?.yearMax) query.lte("year", filters.yearMax);
  if (filters?.mileageMin) query.gte("mileage_km", filters.mileageMin);
  if (filters?.mileageMax) query.lte("mileage_km", filters.mileageMax);
  if (filters?.fuel) {
    const fuelValues = Array.isArray(filters.fuel) ? filters.fuel : [filters.fuel];
    query.in("fuel", fuelValues);
  }
  if (filters?.transmission) query.eq("transmission", filters.transmission);
  if (filters?.body) {
    const bodyValues = Array.isArray(filters.body) ? filters.body : [filters.body];
    query.in("body", bodyValues);
  }
  if (filters?.drive) query.eq("drive", filters.drive);
  if (filters?.make) query.ilike("title", `%${filters.make}%`);
  if (filters?.model) query.ilike("title", `%${filters.model}%`);
  if (filters?.query) query.ilike("title", `%${filters.query}%`);
  if (filters?.sellerType) query.eq("seller_type", filters.sellerType);
  if (filters?.color) query.ilike("color", `%${filters.color}%`);
  if (filters?.location) query.ilike("location", `%${filters.location}%`);
  if (filters?.locationRadius) {
    // Placeholder: location radius needs geo; keep text filtering only.
  }
  if (filters?.doors) query.eq("doors", filters.doors);
  if (filters?.seats) query.eq("seats", filters.seats);
  if (filters?.powerMin) query.gte("power_kw", filters.powerMin);
  if (filters?.powerMax) query.lte("power_kw", filters.powerMax);
  if (filters?.evRangeMin) query.gte("ev_range_km", filters.evRangeMin);
  if (filters?.evBatteryMin) query.gte("ev_battery_kwh", filters.evBatteryMin);
  if (filters?.evFastChargeMin) query.gte("ev_fast_charge_kw", filters.evFastChargeMin);
  if (filters?.evChargeType) query.ilike("ev_charge_type", `%${filters.evChargeType}%`);
  if (filters?.co2Min) query.gte("co2_g_km", filters.co2Min);
  if (filters?.co2Max) query.lte("co2_g_km", filters.co2Max);
  // consumption is stored as text; use in-memory filtering instead

  const { data } = await query;
  const mapped = (data as ListingRecord[] | null)?.map(mapListing) || [];
  return applyFilters(mapped, filters);
}

function mapBackendListing(record: any): Listing | null {
  if (!record?.id || !record?.title) return null;
  return {
    id: String(record.id),
    sellerId: record.seller_id ?? record.sellerId ?? undefined,
    title: String(record.title),
    price: Number(record.price ?? 0),
    currency: String(record.currency ?? "EUR"),
    year: Number(record.year ?? 0),
    mileageKm: Number(record.mileage_km ?? record.mileageKm ?? 0),
    fuel: record.fuel ?? "Petrol",
    transmission: record.transmission ?? "Automatic",
    powerKw: Number(record.power_kw ?? record.powerKw ?? 0),
    evRangeKm: record.ev_range_km ?? record.evRangeKm ?? undefined,
    evBatteryKwh: record.ev_battery_kwh ?? record.evBatteryKwh ?? undefined,
    evFastChargeKw: record.ev_fast_charge_kw ?? record.evFastChargeKw ?? undefined,
    evChargeType: record.ev_charge_type ?? record.evChargeType ?? undefined,
    co2Gkm: record.co2_g_km ?? record.co2Gkm ?? undefined,
    consumption: record.consumption ?? undefined,
    location: String(record.location ?? ""),
    lat: typeof record.lat === "number" ? record.lat : undefined,
    lng: typeof record.lng === "number" ? record.lng : undefined,
    images: Array.isArray(record.images) ? record.images : [],
    sellerName: String(record.seller_name ?? record.sellerName ?? "Seller"),
    sellerEmail: record.seller_email ?? record.sellerEmail ?? undefined,
    sellerType: record.seller_type ?? record.sellerType ?? "Private",
    dealType: record.deal_type ?? record.dealType ?? undefined,
    verified: typeof record.verified === "boolean" ? record.verified : undefined,
    createdAt: String(record.created_at ?? record.createdAt ?? new Date().toISOString()),
    body: record.body ?? "Sedan",
    color: String(record.color ?? ""),
    drive: record.drive ?? "FWD",
    doors: Number(record.doors ?? 4),
    seats: Number(record.seats ?? 5),
    description: String(record.description ?? ""),
    features: Array.isArray(record.features) ? record.features : [],
    evRangeKm: record.ev_range_km ?? undefined,
    evBatteryKwh: record.ev_battery_kwh ?? undefined,
    evFastChargeKw: record.ev_fast_charge_kw ?? undefined,
    evChargeType: record.ev_charge_type ?? undefined,
    co2Gkm: record.co2_g_km ?? undefined,
    consumption: record.consumption ?? undefined,
    phone: record.phone ?? undefined,
    whatsapp: record.whatsapp ?? undefined
  };
}

function applyFilters(listings: Listing[], filters?: FilterState) {
  if (!filters) return listings;
  return listings.filter((listing) => {
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
    if (filters.dealType === "leasing") {
      const hasLeasing = listing.features.some((item) => item.toLowerCase().includes("leasing"));
      if (!hasLeasing) return false;
    }
    if (filters.verifiedOnly && listing.sellerType !== "Dealer") return false;
    if (filters.color && listing.color.toLowerCase() !== filters.color.toLowerCase()) return false;
    if (filters.location && !listing.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.features && filters.features.length > 0) {
      const set = new Set(listing.features.map((f) => f.toLowerCase()));
      if (!filters.features.every((f) => set.has(f.toLowerCase()))) return false;
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
    if (filters.category) {
      if (filters.category === "Luxury" && listing.price < 45000) return false;
      if (filters.category === "Deals" && listing.price > 20000) return false;
      if (filters.category === "NewArrivals" && listing.year < 2021) return false;
      if (filters.category === "Vans" && listing.body !== "Wagon" && listing.body !== "SUV") return false;
    }
    return true;
  });
}

function parseConsumption(value?: string) {
  if (!value) return null;
  const match = value.match(/[\d.]+/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : null;
}

function mapListing(record: ListingRecord): Listing {
  return {
    id: record.id,
    sellerId: record.seller_id ?? undefined,
    title: record.title,
    price: Number(record.price),
    currency: record.currency,
    year: record.year,
    mileageKm: record.mileage_km,
    fuel: record.fuel,
    transmission: record.transmission,
    powerKw: record.power_kw,
    evRangeKm: record.ev_range_km ?? undefined,
    evBatteryKwh: record.ev_battery_kwh ?? undefined,
    evFastChargeKw: record.ev_fast_charge_kw ?? undefined,
    evChargeType: record.ev_charge_type ?? undefined,
    co2Gkm: record.co2_g_km ?? undefined,
    consumption: record.consumption ?? undefined,
    location: record.location,
    lat: record.lat ?? undefined,
    lng: record.lng ?? undefined,
    images: record.images,
    sellerName: record.seller_name,
    sellerEmail: record.seller_email ?? undefined,
    sellerType: record.seller_type,
    dealType: record.deal_type ?? undefined,
    verified: typeof record.verified === "boolean" ? record.verified : undefined,
    createdAt: record.created_at,
    body: record.body,
    color: record.color,
    drive: record.drive,
    doors: record.doors,
    seats: record.seats,
    description: record.description,
    features: record.features,
    phone: record.phone ?? undefined,
    whatsapp: record.whatsapp ?? undefined
  };
}
