import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { setSaveTheDateEnabled } from "@/lib/site-settings";

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

  const enabled = field(body, "enabled");
  if (field(body, "action") !== "setSaveTheDate" || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Diese Aktion gibt es nicht." }, { status: 400, headers: noStore });
  }

  const result = setSaveTheDateEnabled(enabled);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400, headers: noStore });
  }
  return NextResponse.json({ ok: true }, { headers: noStore });
}

function field(body: unknown, key: string) {
  if (typeof body !== "object" || body === null || !(key in body)) return undefined;
  return (body as Record<string, unknown>)[key];
}
