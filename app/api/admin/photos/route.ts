import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { parseBerlinDateTime } from "@/lib/format";
import {
  removePhoto,
  setAutoApproveEnabled,
  setButtonSchedule,
  setGalleryEnabled,
  setGallerySchedule,
  setPhotoStatus,
  setUploadButtonEnabled,
} from "@/lib/photos";

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

  if (action === "setEnabled" || action === "setUploadButton" || action === "setAutoApprove") {
    const enabled = typeof body === "object" && body !== null && "enabled" in body ? body.enabled : undefined;
    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Diese Aktion gibt es nicht." }, { status: 400, headers: noStore });
    }
    const result =
      action === "setEnabled"
        ? setGalleryEnabled(enabled)
        : action === "setUploadButton"
          ? setUploadButtonEnabled(enabled)
          : setAutoApproveEnabled(enabled);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400, headers: noStore });
    }
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (action === "setGallerySchedule" || action === "setButtonSchedule") {
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Diese Aktion gibt es nicht." }, { status: 400, headers: noStore });
    }
    const enableAt = optionalBerlinTime(body, "enableAt");
    const disableAt = optionalBerlinTime(body, "disableAt");
    if (!enableAt.ok) return NextResponse.json({ error: enableAt.error }, { status: 400, headers: noStore });
    if (!disableAt.ok) return NextResponse.json({ error: disableAt.error }, { status: 400, headers: noStore });
    if (enableAt.iso && disableAt.iso && enableAt.iso === disableAt.iso) {
      return NextResponse.json(
        { error: "Die beiden Uhrzeiten müssen unterschiedlich sein." },
        { status: 400, headers: noStore },
      );
    }
    const result =
      action === "setGallerySchedule"
        ? setGallerySchedule(enableAt.iso, disableAt.iso)
        : setButtonSchedule(enableAt.iso, disableAt.iso);
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

function optionalBerlinTime(body: object, key: string) {
  if (!(key in body)) return { ok: false as const, error: "Diese Aktion gibt es nicht." };
  const value = (body as Record<string, unknown>)[key];
  if (value === null || value === "") return { ok: true as const, iso: null };
  if (typeof value !== "string") return { ok: false as const, error: "Diese Uhrzeit konnten wir nicht lesen." };
  const parsed = parseBerlinDateTime(value);
  if (!parsed.ok) return parsed;
  return { ok: true as const, iso: parsed.iso };
}
