import { invitationDate, wedding } from "@/lib/content";
import { Stationery } from "@/components/ornaments";

const kicker = "font-serif text-[0.68rem] leading-6 font-medium uppercase tracking-[0.28em] text-ink";

export function Welcome() {
  const date = invitationDate(wedding.date);
  const ceremony = wedding.schedule[0].time;

  return (
    <section id="willkommen" className="scroll-mt-28 px-4 pt-8 pb-4 sm:px-6 sm:pt-12">
      <Stationery florals className="mx-auto max-w-lg">
        <div className="px-6 pt-32 pb-44 text-center sm:px-14 sm:pt-28 sm:pb-40">
          <p className={`${kicker} mx-auto max-w-[12.5rem]`}>
            Gemeinsam mit
            <br />
            unseren Familien
            <br />
            laden wir euch
            <br />
            herzlich ein
            <br />
            zur Hochzeit von
          </p>

          <h1 className="mt-6 text-bronze">
            <span className="block font-script text-7xl leading-none sm:text-8xl">Helen</span>
            <span className="mx-auto my-3 flex max-w-[12rem] items-center gap-3">
              <span className="h-px flex-1 bg-gold" />
              <span className="font-serif text-[0.68rem] tracking-[0.42em] text-ink">UND</span>
              <span className="h-px flex-1 bg-gold" />
            </span>
            {/* Great Vibes: der Schwung von „Oliver“ ragt über die Zeile, die Unterlängen von „Helen“ nicht. */}
            <span className="block pt-[0.16em] font-script text-7xl leading-none sm:text-8xl">Oliver</span>
          </h1>

          <p className="mx-auto mt-8 max-w-xs font-serif text-lg leading-relaxed text-ink-soft">{wedding.welcome}</p>

          {date ? (
            <div className="mx-auto mt-9 flex max-w-sm items-center justify-center gap-3 sm:gap-5">
              <p className="w-[4.8rem] text-right font-serif text-[0.68rem] font-medium uppercase tracking-[0.18em] sm:w-24 sm:tracking-[0.22em]">
                {date.weekday}
              </p>
              <span className="h-16 w-px bg-gold" aria-hidden="true" />
              <div className="w-16 text-center sm:w-20">
                <p className="font-serif text-[0.62rem] font-medium tracking-[0.28em] uppercase">{date.monthShort}.</p>
                <p className="font-serif text-5xl leading-none font-medium">{date.day}</p>
                <p className="mt-1 font-serif text-xs tracking-[0.18em]">{date.year}</p>
              </div>
              <span className="h-16 w-px bg-gold" aria-hidden="true" />
              <p className="w-[4.8rem] text-left font-serif text-[0.68rem] font-medium uppercase tracking-[0.14em] sm:w-24 sm:tracking-[0.16em]">
                {ceremony} Uhr
              </p>
            </div>
          ) : (
            <p className="mt-9 font-serif text-3xl">{wedding.date}</p>
          )}
          <div className={`${kicker} mt-9 tracking-[0.22em]`}>
            <p>{wedding.ceremony.title}</p>
            <p className="mt-4">{wedding.ceremony.venue}</p>
            {wedding.ceremony.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          <svg viewBox="0 0 24 24" className="mx-auto mt-7 size-3 text-wine" fill="currentColor" aria-hidden="true">
            <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" />
          </svg>
          <p className="mt-2 font-script text-3xl text-bronze sm:text-4xl">{wedding.celebration.title}</p>
          <div className={`${kicker} mt-3 tracking-[0.22em]`}>
            <a
              href={wedding.celebration.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-gold underline-offset-4"
            >
              {wedding.celebration.venue}
            </a>
            {wedding.celebration.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </Stationery>
    </section>
  );
}
