import Link from "next/link";

const linkClass =
  "font-serif text-[0.68rem] font-medium tracking-[0.16em] text-ink-soft uppercase hover:text-bronze";

export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Rechtliches" className={className}>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        <li>
          <Link href="/impressum" className={linkClass}>
            Impressum
          </Link>
        </li>
        <li>
          <Link href="/datenschutz" className={linkClass}>
            Datenschutz
          </Link>
        </li>
      </ul>
    </nav>
  );
}
