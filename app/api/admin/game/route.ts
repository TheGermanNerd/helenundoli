import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createTask, deletePlayer, deleteTask, moveTask, saveSettings, setGameEnabled, updateTask, type SaveResult } from "@/lib/game";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Bitte zuerst anmelden." }, { status: 401, headers: noStore });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Die Aktion konnte nicht gelesen werden." }, { status: 400, headers: noStore });
  }

  const action = field(body, "action");
  const id = readId(field(body, "id"));
  let result: SaveResult;

  if (action === "setEnabled") {
    const enabled = field(body, "enabled");
    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Diese Aktion gibt es nicht." }, { status: 400, headers: noStore });
    }
    result = setGameEnabled(enabled);
  } else if (action === "saveSettings") {
    result = saveSettings({
      prizeTitle: field(body, "prizeTitle"),
      prizeText: field(body, "prizeText"),
      goalPoints: field(body, "goalPoints"),
    });
  } else if (action === "createTask") {
    result = createTask({
      title: field(body, "title"),
      instruction: field(body, "instruction"),
      points: field(body, "points"),
    });
  } else if (action === "updateTask") {
    if (id === null) return NextResponse.json({ error: "Die Aufgabe konnte nicht gefunden werden." }, { status: 400, headers: noStore });
    result = updateTask(id, {
      title: field(body, "title"),
      instruction: field(body, "instruction"),
      points: field(body, "points"),
    });
  } else if (action === "deleteTask") {
    if (id === null) return NextResponse.json({ error: "Die Aufgabe konnte nicht gefunden werden." }, { status: 400, headers: noStore });
    result = deleteTask(id);
  } else if (action === "moveTask") {
    const direction = field(body, "direction");
    if (id === null || (direction !== "up" && direction !== "down")) {
      return NextResponse.json({ error: "Diese Aktion gibt es nicht." }, { status: 400, headers: noStore });
    }
    result = moveTask(id, direction);
  } else if (action === "deletePlayer") {
    if (id === null) return NextResponse.json({ error: "Der Spieler konnte nicht gefunden werden." }, { status: 400, headers: noStore });
    result = deletePlayer(id);
  } else {
    return NextResponse.json({ error: "Diese Aktion gibt es nicht." }, { status: 400, headers: noStore });
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400, headers: noStore });
  }
  return NextResponse.json({ ok: true }, { headers: noStore });
}

function field(body: unknown, key: string) {
  if (typeof body !== "object" || body === null || !(key in body)) return undefined;
  return (body as Record<string, unknown>)[key];
}

function readId(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return null;
  return value;
}
