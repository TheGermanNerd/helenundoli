import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { listRsvps } from "@/lib/db";
import { csvEscape, formatTimestamp } from "@/lib/format";
import { attendingMealLabel, exportGuestNames, managedGuests, mealLabel } from "@/lib/rsvp";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Bitte zuerst anmelden." }, { status: 401 });
  }

  const header = ["Name", "E-Mail", "Teilnahme", "Anzahl", "Gästenamen", "Menü", "Nachricht", "Zeitpunkt"];
  const lines = listRsvps().map((row) => {
    const guests = managedGuests(row);
    const coming = guests.filter((guest) => guest.attending).length;
    const attending = guests.length === 0 ? row.attending === 1 : coming > 0;
    return [
      row.name,
      row.email,
      attending ? "Zusage" : "Absage",
      guests.length === 0 ? (row.attending ? String(row.guest_count) : "") : String(coming),
      guests.length === 0 ? (row.guest_names ?? "") : exportGuestNames(guests),
      attending ? (guests.length === 0 ? mealLabel(row.meal) : attendingMealLabel(guests)) : "",
      row.message ?? "",
      formatTimestamp(row.created_at),
    ]
      .map(csvEscape)
      .join(";");
  });

  const csv = `\uFEFF${[header.join(";"), ...lines].join("\r\n")}\r\n`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="zusagen.csv"',
      "Cache-Control": "no-store",
    },
  });
}
