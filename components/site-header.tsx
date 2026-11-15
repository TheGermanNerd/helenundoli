import Link from "next/link";
import { connection } from "next/server";
import { getSettings } from "@/lib/game";
import { galleryEnabled, uploadButtonEnabled } from "@/lib/photos";

const links = [
  { href: "/#willkommen", label: "Willkommen" },
  { href: "/#feier", label: "Feier" },
  { href: "/#ablauf", label: "Ablauf" },
  { href: "/#zusagen", label: "Zusagen" },
  { href: "/#fragen", label: "Fragen" },
  { href: "/bilder", label: "Bilder" },
];

export async function SiteHeader() {
  await connection();
  const visible = galleryEnabled() ? links : links.filter((link) => link.href !== "/bilder");
  const items = getSettings().enabled ? [...visible, { href: "/spiel", label: "Spiel" }] : visible;
  const uploadOpen = uploadButtonEnabled();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-gold/40 bg-linen/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/#willkommen" className="font-script text-3xl leading-none whitespace-nowrap text-bronze">
            Helen & Oliver
          </Link>
          <nav aria-label="Abschnitte" className="flex flex-wrap gap-x-4 gap-y-1">
            {items.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="-mx-1.5 rounded-lg px-1.5 py-1 font-serif text-[0.68rem] font-medium tracking-[0.16em] text-ink-soft uppercase outline outline-1 outline-transparent transition-[color,background-color,outline-color] duration-200 hover:bg-paper hover:text-bronze hover:outline-gold"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {uploadOpen ? (
        <div className="px-5 pt-8 text-center">
          <Link
            href="/fotos"
            className="inline-flex rounded-full bg-wine px-8 py-3.5 font-serif text-2xl text-paper shadow-[0_12px_28px_-16px_rgba(122,46,42,0.9)] transition duration-200 hover:bg-wine-deep"
          >
            Fotos teilen
          </Link>
        </div>
      ) : null}
    </>
  );
}
