import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hasAccess } from "@/lib/access";
import { claimTask, createPlayer, getClaimPreview, getSettings, PLAYER_COOKIE, playerCookie, scannedTaskFit } from "@/lib/game";
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
    return NextResponse.json({ error: "Die Aufgabe konnte nicht gelesen werden." }, { status: 400, headers: noStore });
  }

  const token = field(body, "token");
  if (typeof token !== "string" || getClaimPreview(null, token).status === "unknown") {
    return NextResponse.json({ error: "Diesen Code kennen wir nicht." }, { status: 404, headers: noStore });
  }

  const expected = readExpectedTaskId(body);
  if (expected === "invalid") {
    return NextResponse.json({ error: "Die Aufgabe konnte nicht gelesen werden." }, { status: 400, headers: noStore });
  }
  if (typeof expected === "number") {
    const fit = scannedTaskFit(token, expected);
    if (fit === "unknown") {
      return NextResponse.json({ error: "Diesen Code kennen wir nicht." }, { status: 404, headers: noStore });
    }
    if (fit === "other") {
      return NextResponse.json({ error: "Das ist der Code einer anderen Aufgabe." }, { status: 409, headers: noStore });
    }
  }

  const current = (await cookies()).get(PLAYER_COOKIE)?.value ?? null;
  const preview = getClaimPreview(current, token);
  let playerToken = current;
  let freshToken: string | null = null;

  if (preview.status !== "ready" || preview.playerName === null) {
    const parsed = parseName(field(body, "name"));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400, headers: noStore });
    const created = createPlayer(parsed.name);
    if (!created.ok) return NextResponse.json({ error: created.error }, { status: 400, headers: noStore });
    playerToken = created.token;
    freshToken = created.token;
  }

  if (!playerToken) {
    return NextResponse.json({ error: "Bitte zuerst einen Namen eintragen." }, { status: 400, headers: noStore });
  }

  const outcome = claimTask(playerToken, token, typeof expected === "number" ? expected : undefined);
  if (outcome.status === "unknown") {
    return NextResponse.json({ error: "Diesen Code kennen wir nicht." }, { status: 404, headers: noStore });
  }
  if (outcome.status === "other") {
    return NextResponse.json({ error: "Das ist der Code einer anderen Aufgabe." }, { status: 409, headers: noStore });
  }

  const response = NextResponse.json(
    { status: outcome.status, title: outcome.title, points: outcome.points, score: outcome.score },
    { headers: noStore },
  );
  if (freshToken) response.cookies.set(playerCookie(freshToken));
  return response;
}

function field(body: unknown, key: string) {
  if (typeof body !== "object" || body === null || !(key in body)) return undefined;
  return (body as Record<string, unknown>)[key];
}

function readExpectedTaskId(body: unknown) {
  const value = field(body, "taskId");
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return "invalid" as const;
  return value;
}
