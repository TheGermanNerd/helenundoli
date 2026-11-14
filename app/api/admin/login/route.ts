import { NextResponse } from "next/server";
import { checkPassword, sessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Die Anmeldung konnte nicht gelesen werden." }, { status: 400 });
  }

  const password =
    typeof body === "object" && body !== null && "password" in body && typeof body.password === "string"
      ? body.password
      : "";

  const result = checkPassword(password);
  if (result === "missing") {
    return NextResponse.json({ error: "Das Admin-Passwort ist noch nicht eingerichtet." }, { status: 500 });
  }
  if (result === "invalid") {
    return NextResponse.json({ error: "Das Passwort stimmt nicht." }, { status: 401 });
  }

  const cookie = sessionCookie();
  if (!cookie) {
    return NextResponse.json({ error: "Das Admin-Passwort ist noch nicht eingerichtet." }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(cookie);
  return response;
}
