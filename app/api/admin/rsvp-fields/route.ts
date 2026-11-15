import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { saveRsvpFieldRules } from "@/lib/db";
import { parseRsvpFieldRules } from "@/lib/rsvp";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Bitte zuerst anmelden." }, { status: 401, headers: noStore });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Die Pflichtfelder konnten nicht gelesen werden." },
      { status: 400, headers: noStore },
    );
  }

  const parsed = parseRsvpFieldRules(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: noStore });
  }

  try {
    saveRsvpFieldRules(parsed.fields);
  } catch {
    return NextResponse.json(
      { error: "Die Pflichtfelder konnten gerade nicht gespeichert werden. Bitte versucht es noch einmal." },
      { status: 500, headers: noStore },
    );
  }

  return NextResponse.json({ ok: true }, { headers: noStore });
}
