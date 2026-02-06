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
  location: string;
  images: string[];
  seller_name: string;
  seller_type: Listing["sellerType"];
  created_at: string;
  body: Listing["body"];
  color: string;
  drive: Listing["drive"];
  doors: number;
  seats: number;
  description: string;
  features: string[];
};

export async function getListings(filters?: FilterState): Promise<Listing[]> {
  const backendListings = await getListingsFromBackend(filters);
  if (backendListings.length > 0) {
    return backendListings;
  }

  if (!supabase) {
    return applyFilters(mockListings, filters);
  }

  const query = supabase.from("listings").select("*");
  if (filters?.priceMin) query.gte("price", filters.priceMin);
  if (filters?.priceMax) query.lte("price", filters.priceMax);
  if (filters?.yearMin) query.gte("year", filters.yearMin);
  if (filters?.yearMax) query.lte("year", filters.yearMax);
  if (filters?.mileageMax) query.lte("mileage_km", filters.mileageMax);
  if (filters?.fuel) query.eq("fuel", filters.fuel);
  if (filters?.transmission) query.eq("transmission", filters.transmission);
  if (filters?.body) query.eq("body", filters.body);
  if (filters?.drive) query.eq("drive", filters.drive);
  if (filters?.query) query.ilike("title", `%${filters.query}%`);

  const { data } = await query;
  return (data as ListingRecord[] | null)?.map(mapListing) || [];
}

export async function getListing(id: string): Promise<Listing | null> {
  const backendListings = await getListingsFromBackend();
  if (backendListings.length > 0) {
    return backendListings.find((item) => item.id === id) || null;
  }

  if (!supabase) {
    return mockListings.find((listing) => listing.id === id) || null;
  }

  const { data } = await supabase.from("listings").select("*").eq("id", id).single();
  return data ? mapListing(data as ListingRecord) : null;
}

async function getListingsFromBackend(filters?: FilterState): Promise<Listing[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return [];

  try {
    const query = new URLSearchParams();
    if (filters?.query) query.set("q", filters.query);
    if (filters?.priceMin) query.set("priceMin", String(filters.priceMin));
    if (filters?.priceMax) query.set("priceMax", String(filters.priceMax));
    if (filters?.yearMin) query.set("yearMin", String(filters.yearMin));
    if (filters?.yearMax) query.set("yearMax", String(filters.yearMax));
    if (filters?.mileageMax) query.set("mileageMax", String(filters.mileageMax));
    if (filters?.fuel) query.set("fuel", filters.fuel);
    if (filters?.transmission) query.set("transmission", filters.transmission);
    if (filters?.body) query.set("body", filters.body);
    if (filters?.drive) query.set("drive", filters.drive);

    const res = await fetch(`${baseUrl}/api/listings${query.toString() ? `?${query}` : ""}`, {
      cache: "no-store"
    });
    if (!res.ok) return [];

    const payload = await res.json();
    const items = Array.isArray(payload) ? payload : payload.items;
    if (!Array.isArray(items)) return [];

    return items.map(mapBackendListing).filter(Boolean) as Listing[];
  } catch {
    return [];
  }
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
    location: String(record.location ?? ""),
    images: Array.isArray(record.images) ? record.images : [],
    sellerName: String(record.seller_name ?? record.sellerName ?? "Seller"),
    sellerType: record.seller_type ?? record.sellerType ?? "Private",
    createdAt: String(record.created_at ?? record.createdAt ?? new Date().toISOString()),
    body: record.body ?? "Sedan",
    color: String(record.color ?? ""),
    drive: record.drive ?? "FWD",
    doors: Number(record.doors ?? 4),
    seats: Number(record.seats ?? 5),
    description: String(record.description ?? ""),
    features: Array.isArray(record.features) ? record.features : []
  };
}

function applyFilters(listings: Listing[], filters?: FilterState) {
  if (!filters) return listings;
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
  };
}
