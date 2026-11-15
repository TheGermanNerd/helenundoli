import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { setGuestAttendance, setPartyAttendance } from "@/lib/db";

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
  if (typeof body.attending !== "boolean" || (body.action !== "guest" && body.action !== "all")) {
    return NextResponse.json({ error: "Diese Aktion gibt es nicht." }, { status: 400, headers: noStore });
  }

  try {
    const result =
      body.action === "all"
        ? setPartyAttendance(body.id, body.attending)
        : typeof body.index === "number" && Number.isInteger(body.index)
          ? setGuestAttendance(body.id, body.index, body.attending)
          : { ok: false as const, error: "Diese Aktion gibt es nicht." };

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
