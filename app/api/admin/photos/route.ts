import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { removePhoto, setGalleryEnabled, setPhotoStatus, setUploadButtonEnabled } from "@/lib/photos";

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

  const id =
    typeof body === "object" && body !== null && "id" in body && typeof body.id === "number" ? body.id : null;
  const action =
    typeof body === "object" && body !== null && "action" in body && typeof body.action === "string"
      ? body.action
      : "";

  if (action === "setEnabled" || action === "setUploadButton") {
    const enabled = typeof body === "object" && body !== null && "enabled" in body ? body.enabled : undefined;
    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Diese Aktion gibt es nicht." }, { status: 400, headers: noStore });
    }
    const result = action === "setEnabled" ? setGalleryEnabled(enabled) : setUploadButtonEnabled(enabled);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400, headers: noStore });
    }
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (id === null || !Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Das Bild konnte nicht gefunden werden." }, { status: 400, headers: noStore });
  }

  if (action === "delete") {
    if (!removePhoto(id)) {
      return NextResponse.json({ error: "Das Bild gibt es nicht mehr." }, { status: 404, headers: noStore });
    }
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Diese Aktion gibt es nicht." }, { status: 400, headers: noStore });
  }

  const status = action === "approve" ? "approved" : "rejected";
  if (!setPhotoStatus(id, status)) {
    return NextResponse.json({ error: "Das Bild gibt es nicht mehr." }, { status: 404, headers: noStore });
  }

  return NextResponse.json({ ok: true }, { headers: noStore });
}
