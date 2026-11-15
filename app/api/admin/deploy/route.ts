import { connection, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { deployInfo, saveBranch, startUpdate } from "@/lib/deploy";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  await connection();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Bitte zuerst anmelden." }, { status: 401, headers: noStore });
  }
  return NextResponse.json(deployInfo(), { headers: noStore });
}

export async function POST(request: Request) {
  await connection();
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
  if (action === "set-branch") {
    const branch = field(body, "branch");
    if (typeof branch !== "string") {
      return NextResponse.json({ error: "Der Branch-Name ist ungültig." }, { status: 400, headers: noStore });
    }
    const result = saveBranch(branch);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status, headers: noStore });
    }
    return NextResponse.json(deployInfo(), { headers: noStore });
  }

  if (action === "update") {
    const result = startUpdate();
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status, headers: noStore });
    }
    return NextResponse.json(deployInfo(), { headers: noStore });
  }

  return NextResponse.json({ error: "Diese Aktion gibt es nicht." }, { status: 400, headers: noStore });
}

function field(body: unknown, key: string) {
  if (typeof body !== "object" || body === null || !(key in body)) return undefined;
  return (body as Record<string, unknown>)[key];
}
