import { mapsHref, wedding } from "@/lib/content";
import { Stationery } from "@/components/ornaments";

export function Details() {
  return (
    <section id="feier" className="scroll-mt-28 px-4 py-6 sm:px-6 sm:py-8">
      <Stationery className="mx-auto max-w-2xl">
        <div className="px-6 py-12 text-center sm:px-10 sm:py-14">
          <p className="font-serif text-[0.68rem] font-medium tracking-[0.28em] text-olive uppercase">Der Tag</p>
          <h2 className="mt-3 font-serif text-4xl text-bronze sm:text-5xl">Datum und Ort</h2>
        <p className="mx-auto mt-6 max-w-md text-center text-lg leading-relaxed text-ink-soft">{wedding.place}</p>
        <div className="mt-10 space-y-4 text-left">
          <article className="border border-line bg-cream/70 px-6 py-6">
            <h3 className="font-serif text-2xl text-bronze">Wann</h3>
            <p className="mt-3 font-serif text-3xl">{wedding.date}</p>
          </article>
          <article className="border border-line bg-cream/70 px-6 py-6">
            <h3 className="font-serif text-2xl text-bronze">{wedding.ceremony.title}</h3>
            <p className="mt-3 font-serif text-3xl">{wedding.ceremony.venue}</p>
            {wedding.ceremony.lines.map((line) => (
              <p key={line} className="mt-1 text-ink-soft">
                {line}
              </p>
            ))}
            <a
              href={mapsHref(wedding.ceremony.mapsQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block text-sm font-medium tracking-wide text-bronze underline decoration-gold decoration-1 underline-offset-4"
            >
              Route öffnen
            </a>
          </article>
          <article className="border border-line bg-cream/70 px-6 py-6">
            <h3 className="font-serif text-2xl text-bronze">Feier</h3>
            <p className="mt-3 font-serif text-3xl">
              <a href={wedding.celebration.href} target="_blank" rel="noopener noreferrer" className="underline decoration-gold underline-offset-4">
                {wedding.celebration.venue}
              </a>
            </p>
            {wedding.celebration.lines.map((line) => (
              <p key={line} className="mt-1 text-ink-soft">
                {line}
              </p>
            ))}
            <a
              href={mapsHref(wedding.celebration.mapsQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block text-sm font-medium tracking-wide text-bronze underline decoration-gold decoration-1 underline-offset-4"
            >
              Route öffnen
            </a>
          </article>
        </div>
        </div>
      </Stationery>
    </section>
  );
}
