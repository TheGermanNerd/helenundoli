import { NextResponse } from "next/server";
import { accessCookie, checkAccessCode } from "@/lib/access";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Der Code konnte nicht gelesen werden." }, { status: 400 });
  }

  const code =
    typeof body === "object" && body !== null && "code" in body && typeof body.code === "string" ? body.code : "";

  const result = checkAccessCode(code);
  if (result === "missing") {
    return NextResponse.json({ error: "Der Zugangscode ist noch nicht eingerichtet." }, { status: 500 });
  }
  if (result === "invalid") {
    return NextResponse.json(
      { error: "Der Code stimmt leider nicht. Schaut noch einmal nach, oder schreibt uns kurz." },
      { status: 401 },
    );
  }

  const cookie = accessCookie();
  if (!cookie) {
    return NextResponse.json({ error: "Der Zugangscode ist noch nicht eingerichtet." }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(cookie);
  return response;
}
