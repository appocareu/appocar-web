import { AppShell } from "@/components/AppShell";
import { SearchClient } from "@/components/SearchClient";
import { SearchHeader } from "@/components/SearchHeader";
import { getListingsWithMeta } from "@/lib/listings";
import type { FilterState } from "@appocar/shared";

export default async function SearchPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const filters: FilterState = {
    query: typeof searchParams?.query === "string" ? searchParams.query : "",
    make: typeof searchParams?.make === "string" ? searchParams.make : undefined,
    model: typeof searchParams?.model === "string" ? searchParams.model : undefined,
    dealType: typeof searchParams?.dealType === "string" ? (searchParams.dealType as FilterState["dealType"]) : undefined,
    verifiedOnly: searchParams?.verifiedOnly === "true"
  };
  if (typeof searchParams?.sort === "string") filters.sort = searchParams.sort;
  if (typeof searchParams?.priceMin === "string") filters.priceMin = Number(searchParams.priceMin);
  if (typeof searchParams?.priceMax === "string") filters.priceMax = Number(searchParams.priceMax);
  if (typeof searchParams?.yearMin === "string") filters.yearMin = Number(searchParams.yearMin);
  if (typeof searchParams?.yearMax === "string") filters.yearMax = Number(searchParams.yearMax);
  if (typeof searchParams?.mileageMin === "string") filters.mileageMin = Number(searchParams.mileageMin);
  if (typeof searchParams?.mileageMax === "string") filters.mileageMax = Number(searchParams.mileageMax);
  if (typeof searchParams?.fuel === "string") {
    filters.fuel = searchParams.fuel.includes(",")
      ? (searchParams.fuel.split(",").filter(Boolean) as FilterState["fuel"])
      : (searchParams.fuel as FilterState["fuel"]);
  }
  if (typeof searchParams?.transmission === "string") filters.transmission = searchParams.transmission as FilterState["transmission"];
  if (typeof searchParams?.body === "string") {
    filters.body = searchParams.body.includes(",")
      ? (searchParams.body.split(",").filter(Boolean) as FilterState["body"])
      : (searchParams.body as FilterState["body"]);
  }
  if (typeof searchParams?.drive === "string") filters.drive = searchParams.drive as FilterState["drive"];
  if (typeof searchParams?.sellerType === "string") filters.sellerType = searchParams.sellerType as FilterState["sellerType"];
  if (typeof searchParams?.color === "string") filters.color = searchParams.color;
  if (typeof searchParams?.location === "string") filters.location = searchParams.location;
  if (typeof searchParams?.locationRadius === "string") filters.locationRadius = Number(searchParams.locationRadius);
  if (typeof searchParams?.doors === "string") filters.doors = Number(searchParams.doors);
  if (typeof searchParams?.seats === "string") filters.seats = Number(searchParams.seats);
  if (typeof searchParams?.powerMin === "string") filters.powerMin = Number(searchParams.powerMin);
  if (typeof searchParams?.powerMax === "string") filters.powerMax = Number(searchParams.powerMax);
  if (typeof searchParams?.evRangeMin === "string") filters.evRangeMin = Number(searchParams.evRangeMin);
  if (typeof searchParams?.evBatteryMin === "string") filters.evBatteryMin = Number(searchParams.evBatteryMin);
  if (typeof searchParams?.evFastChargeMin === "string") filters.evFastChargeMin = Number(searchParams.evFastChargeMin);
  if (typeof searchParams?.evChargeType === "string") filters.evChargeType = searchParams.evChargeType;
  if (typeof searchParams?.co2Min === "string") filters.co2Min = Number(searchParams.co2Min);
  if (typeof searchParams?.co2Max === "string") filters.co2Max = Number(searchParams.co2Max);
  if (typeof searchParams?.consumptionMin === "string") filters.consumptionMin = Number(searchParams.consumptionMin);
  if (typeof searchParams?.consumptionMax === "string") filters.consumptionMax = Number(searchParams.consumptionMax);
  if (typeof searchParams?.category === "string") filters.category = searchParams.category;
  if (typeof searchParams?.features === "string") filters.features = searchParams.features.split(",").filter(Boolean);

  const page = typeof searchParams?.page === "string" ? Number(searchParams.page) : 1;
  const pageSize = typeof searchParams?.pageSize === "string" ? Number(searchParams.pageSize) : 12;

  const { items, count } = await getListingsWithMeta(filters, { page, pageSize });
  return (
    <AppShell active="/search">
      <SearchHeader />
      <SearchClient listings={items} totalCount={count} serverPageSize={pageSize} />
    </AppShell>
  );
}
