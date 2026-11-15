import fs from "node:fs";
import { NextResponse } from "next/server";
import { hasAccess } from "@/lib/access";
import {
  MAX_PHOTOS,
  PhotoError,
  uploadButtonEnabled,
  insertPhoto,
  parsePhotoFields,
  photoFilePath,
  storePhoto,
} from "@/lib/photos";

function textField(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!uploadButtonEnabled()) {
    return NextResponse.json({ error: "Fotos teilen ist ausgeschaltet." }, { status: 404, headers: noStore });
  }
  if (!(await hasAccess())) {
    return NextResponse.json({ error: "Bitte gebt zuerst den Zugangscode ein." }, { status: 401, headers: noStore });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Die Bilder konnten nicht gelesen werden." }, { status: 400, headers: noStore });
  }

  const parsed = parsePhotoFields(textField(form, "name"), textField(form, "caption"), textField(form, "fax"));
  if (parsed.status === "ignored") {
    return NextResponse.json({ ok: true, saved: 0, failed: 0 }, { headers: noStore });
  }
  if (parsed.status === "error") {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: noStore });
  }

  const files = form
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "Bitte wählt mindestens ein Bild aus." }, { status: 400, headers: noStore });
  }
  if (files.length > MAX_PHOTOS) {
    return NextResponse.json(
      { error: "Bitte höchstens 12 Bilder auf einmal." },
      { status: 400, headers: noStore },
    );
  }

  let saved = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const filename = await storePhoto(Buffer.from(await file.arrayBuffer()));
      try {
        insertPhoto({ name: parsed.name, caption: parsed.caption, filename });
        saved += 1;
      } catch (error) {
        const stored = photoFilePath(filename);
        if (stored) fs.rmSync(stored, { force: true });
        throw error;
      }
    } catch (error) {
      if (error instanceof PhotoError) {
        failed += 1;
        continue;
      }
      throw error;
    }
  }

  if (saved === 0) {
    return NextResponse.json(
      { error: "Wir konnten kein Bild speichern. Bitte schickt JPEG, PNG, WebP oder HEIC, höchstens 12 MB pro Bild." },
      { status: 400, headers: noStore },
    );
  }

  return NextResponse.json({ ok: true, saved, failed }, { headers: noStore });
}
