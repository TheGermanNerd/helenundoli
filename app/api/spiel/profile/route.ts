import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hasAccess } from "@/lib/access";
import { createPlayer, getSettings, PLAYER_COOKIE, playerCookie, renamePlayer } from "@/lib/game";
import { parseName } from "@/lib/game-input";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!getSettings().enabled) {
    return NextResponse.json({ error: "Das Spiel ist ausgeschaltet." }, { status: 404, headers: noStore });
  }
  if (!(await hasAccess())) {
    return NextResponse.json({ error: "Bitte gebt zuerst den Zugangscode ein." }, { status: 401, headers: noStore });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Der Name konnte nicht gelesen werden." }, { status: 400, headers: noStore });
  }

  const parsed = parseName(field(body, "name"));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400, headers: noStore });

  const token = (await cookies()).get(PLAYER_COOKIE)?.value;
  if (token) {
    const renamed = renamePlayer(token, parsed.name);
    if (renamed.ok) return NextResponse.json({ name: parsed.name }, { headers: noStore });
    if (renamed.status !== 404) {
      return NextResponse.json({ error: renamed.error }, { status: renamed.status ?? 400, headers: noStore });
    }
  }

  const created = createPlayer(parsed.name);
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: 400, headers: noStore });

  const response = NextResponse.json({ name: created.name }, { headers: noStore });
  response.cookies.set(playerCookie(created.token));
  return response;
}

function field(body: unknown, key: string) {
  if (typeof body !== "object" || body === null || !(key in body)) return undefined;
  return (body as Record<string, unknown>)[key];
}
