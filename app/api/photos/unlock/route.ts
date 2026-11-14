import { NextResponse } from "next/server";
import { hasAccess } from "@/lib/access";
import { checkPhotoCode, photoSessionCookie } from "@/lib/auth";
import { galleryEnabled } from "@/lib/photos";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!galleryEnabled()) {
    return NextResponse.json({ error: "Die Bilder sind ausgeschaltet." }, { status: 404, headers: noStore });
  }
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
    return NextResponse.json({ error: "Der Code konnte nicht gelesen werden." }, { status: 400 });
  }

  const code =
    typeof body === "object" && body !== null && "code" in body && typeof body.code === "string" ? body.code : "";

  const result = checkPhotoCode(code);
  if (result === "missing") {
    return NextResponse.json(
      { error: "Das Hochladen ist noch nicht eingerichtet." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (result === "invalid") {
    return NextResponse.json(
      { error: "Der Code stimmt nicht." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const cookie = photoSessionCookie();
  if (!cookie) {
    return NextResponse.json(
      { error: "Das Hochladen ist noch nicht eingerichtet." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(cookie);
  return response;
}
