import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { deleteRsvp, removeGuest, setGuestAttendance, setPartyAttendance } from "@/lib/db";

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
    return NextResponse.json({ error: "Die Änderung konnte nicht gelesen werden." }, { status: 400, headers: noStore });
  }

  if (!isRecord(body) || typeof body.id !== "number" || !Number.isInteger(body.id) || body.id < 1) {
    return NextResponse.json({ error: "Diese Antwort gibt es nicht." }, { status: 400, headers: noStore });
  }
  const missing = { ok: false as const, error: "Diese Aktion gibt es nicht." };
  let result: { ok: true } | { ok: false; error: string };

  try {
    if (body.action === "delete") {
      result = deleteRsvp(body.id);
    } else if (body.action === "delete-guest") {
      result =
        typeof body.index === "number" && Number.isInteger(body.index) ? removeGuest(body.id, body.index) : missing;
    } else if ((body.action === "guest" || body.action === "all") && typeof body.attending === "boolean") {
      result =
        body.action === "all"
          ? setPartyAttendance(body.id, body.attending)
          : typeof body.index === "number" && Number.isInteger(body.index)
            ? setGuestAttendance(body.id, body.index, body.attending)
            : missing;
    } else {
      result = missing;
    }

    if (!result.ok) {
      const status = result.error === "Diese Aktion gibt es nicht." ? 400 : 404;
      return NextResponse.json({ error: result.error }, { status, headers: noStore });
    }
  } catch {
    return NextResponse.json(
      { error: "Die Änderung konnte gerade nicht gespeichert werden." },
      { status: 500, headers: noStore },
    );
  }

  return NextResponse.json({ ok: true }, { headers: noStore });
}
