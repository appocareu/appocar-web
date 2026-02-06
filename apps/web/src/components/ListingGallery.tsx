"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

export function ListingGallery({ images, title }: { images: string[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const safeImages = useMemo(() => (images.length > 0 ? images : ["/placeholder.jpg"]), [images]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowRight") setActiveIndex((i) => (i + 1) % safeImages.length);
      if (event.key === "ArrowLeft") setActiveIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, safeImages.length]);

  return (
    <div className="gallery">
      <button className="gallery-main" onClick={() => setOpen(true)} aria-label="Open gallery">
        <Image
          src={safeImages[activeIndex]}
          alt={title}
          width={900}
          height={560}
          quality={65}
          priority
          sizes="(max-width: 768px) 100vw, 70vw"
        />
        <span className="gallery-count">{activeIndex + 1} / {safeImages.length}</span>
      </button>

      <div className="gallery-thumbs">
        {safeImages.map((src, index) => (
          <button
            key={src + index}
            className={index === activeIndex ? "thumb active" : "thumb"}
            onClick={() => setActiveIndex(index)}
            aria-label={`Select image ${index + 1}`}
          >
            <Image src={src} alt={title} width={140} height={90} quality={55} loading="lazy" />
          </button>
        ))}
      </div>

      {open && (
        <div className="lightbox" role="dialog" aria-modal="true">
          <button className="lightbox-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          <button className="lightbox-nav prev" onClick={() => setActiveIndex((i) => (i - 1 + safeImages.length) % safeImages.length)} aria-label="Previous">‹</button>
          <div className="lightbox-frame">
            <Image
              src={safeImages[activeIndex]}
              alt={title}
              width={1400}
              height={900}
              quality={70}
              priority
              sizes="100vw"
            />
          </div>
          <button className="lightbox-nav next" onClick={() => setActiveIndex((i) => (i + 1) % safeImages.length)} aria-label="Next">›</button>
        </div>
      )}
    </div>
  );
}
