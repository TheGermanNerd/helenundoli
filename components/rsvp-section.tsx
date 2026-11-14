import { wedding } from "@/lib/content";
import { PlaceholderNote, Stationery } from "@/components/ornaments";
import { RsvpForm } from "@/components/rsvp-form";

export function RsvpSection() {
  return (
    <section id="zusagen" className="scroll-mt-28 px-4 py-6 sm:px-6 sm:py-8">
      <Stationery className="mx-auto max-w-2xl">
        <div className="px-6 py-12 sm:px-10 sm:py-14">
          <div className="text-center">
            <p className="font-serif text-[0.68rem] font-medium tracking-[0.28em] text-olive uppercase">Rückmeldung</p>
            <h2 className="mt-3 font-serif text-4xl text-bronze sm:text-5xl">Sagt uns Bescheid</h2>
          <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
            Bitte sagt uns bis zum {wedding.replyBy} Bescheid, ob ihr dabei seid.
          </p>
          <PlaceholderNote>Platzhalterdatum</PlaceholderNote>
        </div>
          <div className="mt-10">
            <RsvpForm />
          </div>
        </div>
      </Stationery>
    </section>
  );
}
