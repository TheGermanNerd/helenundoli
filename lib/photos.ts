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

type GallerySettingsRow = {
  enabled: number;
  button_enabled: number;
  auto_approve: number;
  enable_at: string | null;
  disable_at: string | null;
  button_enable_at: string | null;
  button_disable_at: string | null;
};

export type VisibilitySwitch = {
  enabled: boolean;
  enableAt: string | null;
  disableAt: string | null;
};

export function resolveSwitch(
  enabled: boolean,
  enableAt: string | null,
  disableAt: string | null,
  now: number,
) {
  const events: { at: number; enabled: boolean; which: "on" | "off" }[] = [];
  const onAt = enableAt ? Date.parse(enableAt) : Number.NaN;
  const offAt = disableAt ? Date.parse(disableAt) : Number.NaN;
  if (enableAt && !Number.isNaN(onAt) && onAt <= now) events.push({ at: onAt, enabled: true, which: "on" });
  if (disableAt && !Number.isNaN(offAt) && offAt <= now) events.push({ at: offAt, enabled: false, which: "off" });
  if (events.length === 0) return { enabled, enableAt, disableAt, changed: false };

  events.sort((left, right) => left.at - right.at);
  const last = events[events.length - 1];
  return {
    enabled: last.enabled,
    enableAt: events.some((event) => event.which === "on") ? null : enableAt,
    disableAt: events.some((event) => event.which === "off") ? null : disableAt,
    changed: true,
  };
}

function gallerySettings() {
  const row = getDb()
    .prepare(
      `SELECT enabled, button_enabled, auto_approve, enable_at, disable_at, button_enable_at, button_disable_at
       FROM gallery_settings WHERE id = 1`,
    )
    .get() as GallerySettingsRow | undefined;
  if (!row) return undefined;
  return applyDueSchedules(row);
}

function applyDueSchedules(row: GallerySettingsRow) {
  const now = Date.now();
  const gallery = resolveSwitch(row.enabled === 1, row.enable_at, row.disable_at, now);
  const button = resolveSwitch(row.button_enabled === 1, row.button_enable_at, row.button_disable_at, now);
  if (!gallery.changed && !button.changed) return row;

  const next: GallerySettingsRow = {
    enabled: gallery.enabled ? 1 : 0,
    button_enabled: button.enabled ? 1 : 0,
    auto_approve: row.auto_approve,
    enable_at: gallery.enableAt,
    disable_at: gallery.disableAt,
    button_enable_at: button.enableAt,
    button_disable_at: button.disableAt,
  };
  getDb()
    .prepare(
      `UPDATE gallery_settings
       SET enabled = @enabled, button_enabled = @button_enabled,
           enable_at = @enable_at, disable_at = @disable_at,
           button_enable_at = @button_enable_at, button_disable_at = @button_disable_at
       WHERE id = 1`,
    )
    .run(next);
  return next;
}

export function gallerySwitches(): { gallery: VisibilitySwitch; button: VisibilitySwitch } {
  const row = gallerySettings();
  if (!row) {
    return {
      gallery: { enabled: true, enableAt: null, disableAt: null },
      button: { enabled: true, enableAt: null, disableAt: null },
    };
  }
  return {
    gallery: { enabled: row.enabled === 1, enableAt: row.enable_at, disableAt: row.disable_at },
    button: {
      enabled: row.button_enabled === 1,
      enableAt: row.button_enable_at,
      disableAt: row.button_disable_at,
    },
  };
}

export function galleryEnabled() {
  return gallerySwitches().gallery.enabled;
}

export function uploadButtonEnabled() {
  return gallerySwitches().button.enabled;
}

export function setGalleryEnabled(enabled: boolean): { ok: true } | { ok: false; error: string } {
  gallerySettings();
  const info = getDb()
    .prepare(
      enabled
        ? "UPDATE gallery_settings SET enabled = 1, enable_at = NULL WHERE id = 1"
        : "UPDATE gallery_settings SET enabled = 0, disable_at = NULL WHERE id = 1",
    )
    .run();
  if (info.changes === 0) return { ok: false, error: "Die Bilder konnten nicht umgestellt werden." };
  return { ok: true };
}

export function setUploadButtonEnabled(enabled: boolean): { ok: true } | { ok: false; error: string } {
  gallerySettings();
  const info = getDb()
    .prepare(
      enabled
        ? "UPDATE gallery_settings SET button_enabled = 1, button_enable_at = NULL WHERE id = 1"
        : "UPDATE gallery_settings SET button_enabled = 0, button_disable_at = NULL WHERE id = 1",
    )
    .run();
  if (info.changes === 0) return { ok: false, error: "Der Button konnte nicht umgestellt werden." };
  return { ok: true };
}

export function setGallerySchedule(
  enableAt: string | null,
  disableAt: string | null,
): { ok: true } | { ok: false; error: string } {
  const info = getDb()
    .prepare("UPDATE gallery_settings SET enable_at = ?, disable_at = ? WHERE id = 1")
    .run(enableAt, disableAt);
  if (info.changes === 0) return { ok: false, error: "Der Zeitplan konnte nicht gespeichert werden." };
  return { ok: true };
}

export function setButtonSchedule(
  enableAt: string | null,
  disableAt: string | null,
): { ok: true } | { ok: false; error: string } {
  const info = getDb()
    .prepare("UPDATE gallery_settings SET button_enable_at = ?, button_disable_at = ? WHERE id = 1")
    .run(enableAt, disableAt);
  if (info.changes === 0) return { ok: false, error: "Der Zeitplan konnte nicht gespeichert werden." };
  return { ok: true };
}

export function autoApproveEnabled() {
  const row = gallerySettings();
  if (!row) return false;
  return row.auto_approve === 1;
}

export function setAutoApproveEnabled(enabled: boolean): { ok: true } | { ok: false; error: string } {
  const info = getDb().prepare("UPDATE gallery_settings SET auto_approve = ? WHERE id = 1").run(enabled ? 1 : 0);
  if (info.changes === 0) return { ok: false, error: "Die Freigabe konnte nicht umgestellt werden." };
  return { ok: true };
}

export function insertPhoto(photo: { name: string; caption: string | null; filename: string }) {
  const status = autoApproveEnabled() ? "approved" : "pending";
  getDb()
    .prepare(
      `INSERT INTO photos (name, caption, status, filename, created_at)
       VALUES (@name, @caption, @status, @filename, @createdAt)`,
    )
    .run({
      name: photo.name,
      caption: photo.caption,
      status,
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
