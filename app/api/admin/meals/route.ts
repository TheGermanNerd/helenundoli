import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { saveMealOptions } from "@/lib/meals";
import { parseMealDraft } from "@/lib/rsvp";

const noStore = { "Cache-Control": "no-store" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Bitte zuerst anmelden." }, { status: 401, headers: noStore });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Die Menüs konnten nicht gelesen werden." }, { status: 400, headers: noStore });
  }

  try {
    const parsed = parseMealDraft(isRecord(body) ? body.meals : null);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400, headers: noStore });
    }

    const saved = saveMealOptions(parsed.meals);
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: 400, headers: noStore });
    }
  } catch {
    return NextResponse.json(
      { error: "Die Menüs konnten gerade nicht gespeichert werden. Bitte versucht es noch einmal." },
      { status: 500, headers: noStore },
    );
  }

  return NextResponse.json({ ok: true }, { headers: noStore });
}
