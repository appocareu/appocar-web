import { AppShell } from "@/components/AppShell";
import { SearchClient } from "@/components/SearchClient";
import { SearchHeader } from "@/components/SearchHeader";
import { getListings } from "@/lib/listings";

export default async function SearchPage() {
  const listings = await getListings();
  return (
    <AppShell active="/search">
      <SearchHeader />
      <SearchClient listings={listings} />
    </AppShell>
  );
}
