import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { getDb } from "@/lib/db";
import { MAX_PHOTO_BYTES } from "@/lib/photo-limits";

export { MAX_PHOTOS, MAX_PHOTO_BYTES } from "@/lib/photo-limits";
const MAX_EDGE = 2000;
const MAX_PIXELS = 90_000_000;
const SAFE_FILENAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/i;

export type PhotoStatus = "pending" | "approved" | "rejected";

export type PhotoRow = {
  id: number;
  name: string;
  caption: string | null;
  status: PhotoStatus;
  filename: string;
  created_at: string;
};

export class PhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoError";
  }
}

const FORMATS = new Set(["jpeg", "png", "webp", "heif"]);

function photosDir() {
  const dir = path.join(process.cwd(), "data", "photos");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function photoFilePath(filename: string) {
  if (!SAFE_FILENAME.test(filename)) return null;
  const file = path.join(photosDir(), filename);
  const root = `${photosDir()}${path.sep}`;
  if (!file.startsWith(root)) return null;
  return file;
}

function cleanLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function parsePhotoFields(name: string, caption: string, fax: string) {
  if (cleanLine(fax).length > 0) return { status: "ignored" as const };

  const cleanName = cleanLine(name);
  if (!cleanName) return { status: "error" as const, error: "Bitte gebt einen Namen an." };
  if (cleanName.length > 120) return { status: "error" as const, error: "Der Name ist zu lang." };

  const cleanCaption = caption.replace(/\r\n/g, "\n").trim();
  if (cleanCaption.length > 240) return { status: "error" as const, error: "Der Bildtext ist zu lang." };

  return {
    status: "ok" as const,
    name: cleanName,
    caption: cleanCaption ? cleanCaption : null,
  };
}

export async function storePhoto(input: Buffer) {
  if (input.byteLength === 0 || input.byteLength > MAX_PHOTO_BYTES) {
    throw new PhotoError("Ein Bild ist größer als 12 MB.");
  }

  const options = { failOn: "none" as const, limitInputPixels: MAX_PIXELS, animated: false };
  let output: Buffer;
  try {
    const meta = await sharp(input, options).metadata();
    if (!meta.format || !FORMATS.has(meta.format)) {
      throw new PhotoError("Bitte schickt JPEG, PNG, WebP oder HEIC.");
    }
    output = await sharp(input, options)
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch (error) {
    if (error instanceof PhotoError) throw error;
    throw new PhotoError("Dieses Bild konnten wir nicht lesen. Bitte schickt ein JPEG, PNG, WebP oder HEIC.");
  }

  const filename = `${randomUUID()}.jpg`;
  await fs.promises.writeFile(path.join(photosDir(), filename), output);
  return filename;
}

export function galleryEnabled() {
  const row = getDb().prepare("SELECT enabled FROM gallery_settings WHERE id = 1").get() as
    | { enabled: number }
    | undefined;
  if (!row) return true;
  return row.enabled === 1;
}

export function setGalleryEnabled(enabled: boolean): { ok: true } | { ok: false; error: string } {
  const info = getDb().prepare("UPDATE gallery_settings SET enabled = ? WHERE id = 1").run(enabled ? 1 : 0);
  if (info.changes === 0) return { ok: false, error: "Die Bilder konnten nicht umgestellt werden." };
  return { ok: true };
}

export function insertPhoto(photo: { name: string; caption: string | null; filename: string }) {
  getDb()
    .prepare(
      `INSERT INTO photos (name, caption, status, filename, created_at)
       VALUES (@name, @caption, 'pending', @filename, @createdAt)`,
    )
    .run({
      name: photo.name,
      caption: photo.caption,
      filename: photo.filename,
      createdAt: new Date().toISOString(),
    });
}

export function listPhotos() {
  return getDb()
    .prepare(
      `SELECT * FROM photos
       ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
                datetime(created_at) DESC,
                id DESC`,
    )
    .all() as PhotoRow[];
}

export function listApprovedPhotos() {
  return getDb()
    .prepare(
      `SELECT id, name, caption, status, filename, created_at
       FROM photos
       WHERE status = 'approved'
       ORDER BY datetime(created_at) DESC, id DESC`,
    )
    .all() as PhotoRow[];
}

export async function galleryPhotos() {
  const rows = listApprovedPhotos();
  return Promise.all(
    rows.map(async (photo) => {
      const file = photoFilePath(photo.filename);
      let width = 3;
      let height = 4;
      if (file) {
        try {
          const meta = await sharp(file).metadata();
          if (meta.width && meta.height) {
            width = meta.width;
            height = meta.height;
          }
        } catch {
          // Keep the portrait fallback when the file cannot be measured.
        }
      }
      return { id: photo.id, name: photo.name, caption: photo.caption, width, height };
    }),
  );
}

export function getPhoto(id: number) {
  return (
    (getDb().prepare("SELECT * FROM photos WHERE id = ?").get(id) as PhotoRow | undefined) ?? null
  );
}

export function setPhotoStatus(id: number, status: "approved" | "rejected") {
  getDb().prepare("UPDATE photos SET status = ? WHERE id = ?").run(status, id);
  return getPhoto(id)?.status === status;
}

export function removePhoto(id: number) {
  const photo = getPhoto(id);
  if (!photo) return false;
  getDb().prepare("DELETE FROM photos WHERE id = ?").run(id);
  const file = photoFilePath(photo.filename);
  if (file) fs.rmSync(file, { force: true });
  return true;
}
