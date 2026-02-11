import Image from "next/image";
import Link from "next/link";
import type { Listing } from "@appocar/shared";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/listing/${listing.id}`} className="surface listing-card">
      <div className="listing-card__media">
        <Image
          src={listing.images[0]}
          alt={listing.title}
          width={460}
          height={280}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          quality={70}
          loading="lazy"
        />
        <span className="listing-card__badge">{listing.sellerType}</span>
      </div>
      <div className="content">
        <div className="card-title">{listing.title}</div>
        <div className="muted">
          {listing.year} · {listing.mileageKm.toLocaleString()} km · {listing.fuel}
        </div>
        <div className="listing-card__price">
          {listing.price.toLocaleString()} {listing.currency}
        </div>
        <div className="listing-card__meta">
          <span>{listing.location}</span>
          <span>{listing.transmission}</span>
          <span>{listing.body}</span>
        </div>
      </div>
    </Link>
  );
}
