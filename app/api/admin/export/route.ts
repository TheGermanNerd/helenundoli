import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { listRsvps } from "@/lib/db";
import { csvEscape, formatTimestamp } from "@/lib/format";
import { mealLabel } from "@/lib/rsvp";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Bitte zuerst anmelden." }, { status: 401 });
  }

  const header = ["Name", "E-Mail", "Teilnahme", "Anzahl", "Gästenamen", "Menü", "Nachricht", "Zeitpunkt"];
  const lines = listRsvps().map((row) =>
    [
      row.name,
      row.email,
      row.attending ? "Zusage" : "Absage",
      row.attending ? String(row.guest_count) : "",
      row.guest_names ?? "",
      row.attending ? mealLabel(row.meal) : "",
      row.message ?? "",
      formatTimestamp(row.created_at),
    ]
      .map(csvEscape)
      .join(";"),
  );

  const csv = `\uFEFF${[header.join(";"), ...lines].join("\r\n")}\r\n`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="zusagen.csv"',
      "Cache-Control": "no-store",
    },
  });
}
