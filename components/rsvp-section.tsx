import { connection } from "next/server";
import { Stationery } from "@/components/ornaments";
import { RsvpForm } from "@/components/rsvp-form";
import { getRsvpFieldRules } from "@/lib/db";
import { listMealOptions } from "@/lib/meals";

export async function RsvpSection() {
  await connection();
  const meals = listMealOptions();
  const fields = getRsvpFieldRules();

  return (
    <section id="zusagen" className="scroll-mt-28 px-4 py-6 sm:px-6 sm:py-8">
      <Stationery className="mx-auto max-w-2xl">
        <div className="px-6 py-12 sm:px-10 sm:py-14">
          <RsvpForm meals={meals} fields={fields} />
        </div>
      </Stationery>
    </section>
  );
}
