import Link from "next/link";
import { connection } from "next/server";
import { getSettings } from "@/lib/game";
import { galleryEnabled } from "@/lib/photos";

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

  return (
    <header className="sticky top-0 z-30 border-b border-gold/40 bg-linen/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/#willkommen" className="font-script text-3xl leading-none text-bronze">
          Helen & Oli
        </Link>
        <nav aria-label="Abschnitte" className="flex flex-wrap gap-x-4 gap-y-1">
          {items.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-1 font-serif text-[0.68rem] font-medium tracking-[0.16em] text-ink-soft uppercase hover:text-bronze"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
