import { wedding } from "@/lib/content";
import { Stationery } from "@/components/ornaments";

export function Schedule() {
  return (
    <section id="ablauf" className="scroll-mt-28 px-4 py-6 sm:px-6 sm:py-8">
      <Stationery className="mx-auto max-w-2xl">
        <div className="px-6 py-12 sm:px-10 sm:py-14">
          <div className="text-center">
            <p className="font-serif text-[0.68rem] font-medium tracking-[0.28em] text-olive uppercase">Der Ablauf</p>
            <h2 className="mt-3 font-serif text-4xl text-bronze sm:text-5xl">Wie der Tag verläuft</h2>
          </div>
          <ol className="mt-12">
          {wedding.schedule.map((item, index) => (
            <li key={item.title} className="grid grid-cols-[4.25rem_1.25rem_1fr] gap-x-3 sm:grid-cols-[5rem_1.5rem_1fr] sm:gap-x-4">
              <p className="pt-0.5 text-right font-serif text-xl text-bronze sm:text-2xl">{item.time}</p>
              <div className="flex flex-col items-center">
                <span className="mt-2 size-2.5 rounded-full bg-ochre" />
                {index < wedding.schedule.length - 1 ? <span className="w-px flex-1 bg-gold/80" /> : null}
              </div>
              <div className={index < wedding.schedule.length - 1 ? "pb-8" : ""}>
                <h3 className="font-serif text-2xl">{item.title}</h3>
                <p className="mt-1 leading-relaxed text-ink-soft">{item.text}</p>
              </div>
            </li>
          ))}
          </ol>
        </div>
      </Stationery>
    </section>
  );
}
