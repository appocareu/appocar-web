import { AppShell } from "@/components/AppShell";
import { getListing } from "@/lib/listings";
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

  return (
    <AppShell active="/search">
      <ListingView listing={listing} />
    </AppShell>
  );
}
