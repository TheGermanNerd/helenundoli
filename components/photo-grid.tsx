"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export type GalleryPhoto = {
  id: number;
  name: string;
  caption: string | null;
  width: number;
  height: number;
};

function label(photo: GalleryPhoto) {
  return photo.caption ? `${photo.caption}, Foto von ${photo.name}` : `Foto von ${photo.name}`;
}

export function PhotoGrid({ photos }: { photos: GalleryPhoto[] }) {
  const [active, setActive] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
    }

    function move(direction: 1 | -1) {
      setActive((current) => {
        if (!current || photos.length < 2) return current;
        const index = photos.findIndex((photo) => photo.id === current.id);
        return photos[(index + direction + photos.length) % photos.length] ?? current;
      });
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [active, photos]);

  function step(direction: 1 | -1) {
    setActive((current) => {
      if (!current) return current;
      const index = photos.findIndex((photo) => photo.id === current.id);
      return photos[(index + direction + photos.length) % photos.length] ?? current;
    });
  }

  const layout =
    photos.length === 1
      ? "mx-auto mt-12 max-w-xl"
      : "mx-auto mt-12 columns-1 gap-5 sm:columns-2 lg:columns-3";

  return (
    <>
      <ul className={layout}>
        {photos.map((photo, index) => (
          <li key={photo.id} className="mb-5 break-inside-avoid">
            <button
              type="button"
              onClick={() => setActive(photo)}
              className="group relative block w-full cursor-pointer overflow-hidden rounded-2xl border border-line/80 bg-paper text-left shadow-[0_24px_50px_-34px_rgba(74,48,28,0.75)]"
            >
              <Image
                src={`/api/photos/${photo.id}`}
                alt={label(photo)}
                width={photo.width}
                height={photo.height}
                unoptimized
                priority={index === 0}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="h-auto w-full transition duration-700 ease-out group-hover:scale-[1.03]"
                style={{ width: "100%", height: "auto" }}
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bronze/80 via-bronze/25 to-transparent px-4 pt-16 pb-4 text-paper">
                <span className="block font-serif text-xl leading-tight">
                  {photo.caption?.trim() ? photo.caption : photo.name}
                </span>
                {photo.caption?.trim() ? (
                  <span className="mt-1 block text-xs tracking-[0.14em] text-paper/80 uppercase">{photo.name}</span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {active ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={label(active)}>
          <button
            type="button"
            className="absolute inset-0 bg-[#241c18]"
            aria-label="Schließen"
            onClick={() => setActive(null)}
          />
          <button
            type="button"
            onClick={() => setActive(null)}
            className="absolute top-4 right-4 z-20 border border-paper/50 px-3 py-2 text-sm text-paper hover:bg-paper hover:text-bronze"
          >
            Schließen
          </button>
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Vorheriges Bild"
                className="absolute top-1/2 left-3 z-20 -translate-y-1/2 border border-paper/50 px-3 py-2 text-paper hover:bg-paper hover:text-bronze sm:left-6"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Nächstes Bild"
                className="absolute top-1/2 right-3 z-20 -translate-y-1/2 border border-paper/50 px-3 py-2 text-paper hover:bg-paper hover:text-bronze sm:right-6"
              >
                ›
              </button>
            </>
          ) : null}
          <figure className="pointer-events-none relative z-10 flex h-full items-center justify-center overflow-hidden px-4 py-16 sm:px-16">
            <div className="pointer-events-auto flex max-h-full max-w-5xl flex-col items-center">
              <Image
                src={`/api/photos/${active.id}`}
                alt={label(active)}
                width={active.width}
                height={active.height}
                unoptimized
                className="h-auto w-auto max-w-full"
                style={{ width: "auto", height: "auto", maxHeight: "calc(100vh - 11rem)" }}
              />
              <figcaption className="mt-4 shrink-0 text-center text-paper">
                {active.caption ? <span className="block font-serif text-2xl">{active.caption}</span> : null}
                <span className="mt-1 block text-xs tracking-[0.16em] text-paper/75 uppercase">{active.name}</span>
              </figcaption>
            </div>
          </figure>
        </div>
      ) : null}
    </>
  );
}
