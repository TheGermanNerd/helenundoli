import fs from "node:fs";
import { PassThrough, Readable } from "node:stream";
import { ZipArchive } from "archiver";
import { connection, NextResponse, type NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { listPhotos, photoFilePath, type PhotoRow, type PhotoStatus } from "@/lib/photos";

const noStore = { "Cache-Control": "no-store" };

const folders: Record<PhotoStatus, string> = {
  pending: "warten",
  approved: "auf-der-seite",
  rejected: "abgelehnt",
};

function safeGuestName(name: string) {
  const cleaned = name
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .slice(0, 80)
    .replace(/[.\s-]+$/g, "");
  return cleaned.length > 0 ? cleaned : "gast";
}

function entryName(photo: PhotoRow) {
  return `${folders[photo.status]}/${photo.id}-${safeGuestName(photo.name)}.jpg`;
}

function selectedIds(request: NextRequest): { ok: true; ids: number[] | null } | { ok: false } {
  const raw = request.nextUrl.searchParams.get("ids");
  if (raw === null) return { ok: true, ids: null };
  if (raw.length === 0) return { ok: false };

  const ids: number[] = [];
  const seen = new Set<number>();
  for (const part of raw.split(",")) {
    if (!/^[1-9]\d*$/.test(part)) return { ok: false };
    const id = Number(part);
    if (!Number.isSafeInteger(id)) return { ok: false };
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  if (ids.length === 0) return { ok: false };
  return { ok: true, ids };
}

function photosToPack(ids: number[] | null) {
  const wanted = ids === null ? null : new Set(ids);
  const ready: { photo: PhotoRow; file: string }[] = [];
  for (const photo of listPhotos()) {
    if (wanted && !wanted.has(photo.id)) continue;
    const file = photoFilePath(photo.filename);
    if (!file || !fs.existsSync(file)) continue;
    ready.push({ photo, file });
  }
  return ready;
}

export async function GET(request: NextRequest) {
  await connection();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Bitte zuerst anmelden." }, { status: 401, headers: noStore });
  }

  const selection = selectedIds(request);
  if (!selection.ok) {
    return NextResponse.json(
      { error: "Die Auswahl konnte nicht gelesen werden." },
      { status: 400, headers: noStore },
    );
  }

  const ready = photosToPack(selection.ids);
  if (ready.length === 0) {
    return NextResponse.json(
      { error: "Es gibt keine Bilder zum Herunterladen." },
      { status: 404, headers: noStore },
    );
  }

  const archive = new ZipArchive({ store: true });
  const output = new PassThrough();
  archive.on("error", (error) => output.destroy(error));
  archive.on("warning", (error) => {
    if (error.code !== "ENOENT") output.destroy(error);
  });
  archive.pipe(output);

  for (const { photo, file } of ready) {
    archive.file(file, { name: entryName(photo) });
  }

  archive.finalize().catch((error: unknown) => {
    output.destroy(error instanceof Error ? error : new Error("Das ZIP konnte nicht erstellt werden."));
  });

  return new NextResponse(Readable.toWeb(output) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="bilder.zip"',
      "Cache-Control": "no-store",
    },
  });
}
