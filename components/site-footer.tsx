import { wedding } from "@/lib/content";
import { LegalLinks } from "@/components/legal-links";

export function SiteFooter() {
  return (
    <footer className="px-5 py-12 text-center">
      <p className="font-script text-4xl text-bronze">{wedding.couple}</p>
      <p className="mt-2 font-serif text-[0.68rem] font-medium tracking-[0.28em] text-ink-soft uppercase">
        Herbst 2027
      </p>
      <LegalLinks className="mt-6" />
    </footer>
  );
}
