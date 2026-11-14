import Link from "next/link";
import { connection } from "next/server";
import { wedding } from "@/lib/content";
import { galleryEnabled } from "@/lib/photos";

export async function SiteFooter() {
  await connection();
  const photosOpen = galleryEnabled();

  return (
    <footer className="px-5 py-12 text-center">
      <p className="font-script text-4xl text-bronze">{wedding.couple}</p>
      <p className="mt-2 font-serif text-[0.68rem] font-medium tracking-[0.28em] text-ink-soft uppercase">
        Herbst 2027
      </p>
      {photosOpen ? (
        <p className="mt-6">
          <Link
            href="/fotos"
            className="font-serif text-[0.68rem] font-medium tracking-[0.16em] text-ink-soft uppercase hover:text-bronze"
          >
            Fotos schicken
          </Link>
        </p>
      ) : null}
    </footer>
  );
}
