import { wedding } from "@/lib/content";
import { PlaceholderNote, Stationery } from "@/components/ornaments";

export function Faq() {
  return (
    <section id="fragen" className="scroll-mt-28 px-4 py-6 sm:px-6 sm:py-8">
      <Stationery className="mx-auto max-w-2xl">
        <div className="px-6 py-12 sm:px-10 sm:py-14">
          <div className="text-center">
            <p className="font-serif text-[0.68rem] font-medium tracking-[0.28em] text-olive uppercase">Gut zu wissen</p>
            <h2 className="mt-3 font-serif text-4xl text-bronze sm:text-5xl">Fragen und Antworten</h2>
            <div className="mt-4">
              <PlaceholderNote>{wedding.faqNote}</PlaceholderNote>
            </div>
          </div>
          <div className="mt-12 divide-y divide-line">
            {wedding.faq.map((item) => (
              <details key={item.question} className="group py-5 first:pt-1 last:pb-0">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-serif text-2xl text-bronze transition-colors marker:content-none hover:text-wine [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>
                  <span aria-hidden="true" className="relative mt-2.5 size-3.5 shrink-0 text-ochre">
                    <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-current" />
                    <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-current transition-transform duration-300 group-open:scale-y-0" />
                  </span>
                </summary>
                <p className="mt-2 pr-8 leading-relaxed text-ink-soft">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </Stationery>
    </section>
  );
}
