import { Stationery } from "@/components/ornaments";
import { RsvpForm } from "@/components/rsvp-form";

export function RsvpSection() {
  return (
    <section id="zusagen" className="scroll-mt-28 px-4 py-6 sm:px-6 sm:py-8">
      <Stationery className="mx-auto max-w-2xl">
        <div className="px-6 py-12 sm:px-10 sm:py-14">
          <RsvpForm />
        </div>
      </Stationery>
    </section>
  );
}
