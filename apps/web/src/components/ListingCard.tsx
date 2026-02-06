import Image from "next/image";
import Link from "next/link";
import type { Listing } from "@appocar/shared";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/listing/${listing.id}`} className="surface listing-card">
      <Image
        src={listing.images[0]}
        alt={listing.title}
        width={400}
        height={220}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        quality={60}
        loading="lazy"
      />
      <div className="content">
        <div className="card-title">{listing.title}</div>
        <div className="muted">
          {listing.year} · {listing.mileageKm.toLocaleString()} km · {listing.fuel}
        </div>
        <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
          {listing.price.toLocaleString()} {listing.currency}
        </div>
        <div className="muted" style={{ fontSize: "0.9rem" }}>
          {listing.location} · {listing.sellerType}
        </div>
      </div>
    </Link>
  );
}
