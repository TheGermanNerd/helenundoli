import { NextResponse } from "next/server";
import { hasAccess } from "@/lib/access";
import { getRsvpFieldRules, insertRsvp } from "@/lib/db";
import { listMealOptions } from "@/lib/meals";
import { parseRsvp } from "@/lib/rsvp";

export async function POST(request: Request) {
  if (!(await hasAccess())) {
    return NextResponse.json(
      { error: "Bitte gebt zuerst den Zugangscode ein." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Die Antwort konnte nicht gelesen werden." }, { status: 400 });
  }

  const parsed = parseRsvp(body, listMealOptions(), getRsvpFieldRules());
  if (parsed.status === "error") {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (parsed.status === "ignored") {
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    insertRsvp(parsed.value);
  } catch {
    return NextResponse.json(
      { error: "Die Antwort konnte gerade nicht gespeichert werden. Bitte versucht es noch einmal." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
