import { AppShell } from "@/components/AppShell";
import { getListing, getSimilarListings } from "@/lib/listings";
import { ListingNotFound, ListingView } from "@/components/ListingView";

export default async function ListingPage({ params }: { params: { id: string } }) {
  const listing = await getListing(params.id);

  if (!listing) {
    return (
      <AppShell active="/search">
        <ListingNotFound />
      </AppShell>
    );
  }

  const similar = await getSimilarListings(listing);

  return (
    <AppShell active="/search">
      <ListingView listing={listing} similar={similar} />
    </AppShell>
  );
}
