import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { managedGuests, type ManagedGuest, type NewRsvp } from "@/lib/rsvp";

export type RsvpRow = {
  id: number;
  name: string;
  email: string;
  attending: number;
  guest_count: number;
  guest_names: string | null;
  meal: string | null;
  message: string | null;
  guest_flags: string | null;
  created_at: string;
};

const globalForDb = globalThis as unknown as {
  __rsvpDb?: Database.Database;
  __schemaVersion?: number;
};

const SCHEMA_VERSION = 9;

function ensureSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      attending INTEGER NOT NULL,
      guest_count INTEGER NOT NULL,
      guest_names TEXT,
      meal TEXT,
      message TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      caption TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
      filename TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS game_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      prize_title TEXT NOT NULL,
      prize_text TEXT NOT NULL,
      goal_points INTEGER NOT NULL CHECK (goal_points >= 1),
      enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1))
    );
    CREATE TABLE IF NOT EXISTS game_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position INTEGER NOT NULL,
      title TEXT NOT NULL,
      instruction TEXT NOT NULL,
      points INTEGER NOT NULL CHECK (points >= 1),
      token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS game_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS game_completions (
      player_id INTEGER NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
      task_id INTEGER NOT NULL REFERENCES game_tasks(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (player_id, task_id)
    );
    CREATE TABLE IF NOT EXISTS gallery_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
      button_enabled INTEGER NOT NULL DEFAULT 1 CHECK (button_enabled IN (0, 1)),
      auto_approve INTEGER NOT NULL DEFAULT 0 CHECK (auto_approve IN (0, 1)),
      enable_at TEXT,
      disable_at TEXT,
      button_enable_at TEXT,
      button_disable_at TEXT
    );
  `);
  const columns = database.prepare("PRAGMA table_info(game_settings)").all() as { name: string }[];
  if (!columns.some((column) => column.name === "enabled")) {
    database.exec(
      "ALTER TABLE game_settings ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1))",
    );
  }
  const galleryColumns = database.prepare("PRAGMA table_info(gallery_settings)").all() as { name: string }[];
  if (!galleryColumns.some((column) => column.name === "button_enabled")) {
    database.exec(
      "ALTER TABLE gallery_settings ADD COLUMN button_enabled INTEGER NOT NULL DEFAULT 1 CHECK (button_enabled IN (0, 1))",
    );
  }
  for (const column of ["enable_at", "disable_at", "button_enable_at", "button_disable_at"]) {
    if (!galleryColumns.some((entry) => entry.name === column)) {
      database.exec(`ALTER TABLE gallery_settings ADD COLUMN ${column} TEXT`);
    }
  }
  if (!galleryColumns.some((column) => column.name === "auto_approve")) {
    database.exec(
      "ALTER TABLE gallery_settings ADD COLUMN auto_approve INTEGER NOT NULL DEFAULT 0 CHECK (auto_approve IN (0, 1))",
    );
  }
  const rsvpColumns = database.prepare("PRAGMA table_info(rsvps)").all() as { name: string }[];
  if (!rsvpColumns.some((column) => column.name === "guest_flags")) {
    database.exec("ALTER TABLE rsvps ADD COLUMN guest_flags TEXT");
  }
  database
    .prepare(
      `INSERT INTO game_settings (id, prize_title, prize_text, goal_points)
       SELECT 1, 'Der Preis', 'Du hast genug Punkte für den Preis.', 10
       WHERE NOT EXISTS (SELECT 1 FROM game_settings WHERE id = 1)`,
    )
    .run();
  database
    .prepare(
      `INSERT INTO gallery_settings (id, enabled)
       SELECT 1, 1
       WHERE NOT EXISTS (SELECT 1 FROM gallery_settings WHERE id = 1)`,
    )
    .run();
}

export function getDb() {
  if (!globalForDb.__rsvpDb) {
    const dir = path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    const database = new Database(path.join(dir, "rsvps.sqlite"));
    database.pragma("journal_mode = WAL");
    globalForDb.__rsvpDb = database;
  }

  const database = globalForDb.__rsvpDb;
  database.pragma("foreign_keys = ON");
  if (globalForDb.__schemaVersion !== SCHEMA_VERSION) {
    ensureSchema(database);
    globalForDb.__schemaVersion = SCHEMA_VERSION;
  }

  return database;
}

export function insertRsvp(rsvp: NewRsvp) {
  getDb()
    .prepare(
      `INSERT INTO rsvps
        (name, email, attending, guest_count, guest_names, meal, message, created_at)
       VALUES
        (@name, @email, @attending, @guestCount, @guestNames, @meal, @message, @createdAt)`,
    )
    .run({
      name: rsvp.name,
      email: rsvp.email,
      attending: rsvp.attending ? 1 : 0,
      guestCount: rsvp.guestCount,
      guestNames: rsvp.guestNames,
      meal: rsvp.meal,
      message: rsvp.message,
      createdAt: new Date().toISOString(),
    });
}

export function listRsvps() {
  return getDb()
    .prepare("SELECT * FROM rsvps ORDER BY datetime(created_at) DESC, id DESC")
    .all() as RsvpRow[];
}

export function summarize() {
  const rows = listRsvps();
  let yes = 0;
  let no = 0;
  let people = 0;

  for (const row of rows) {
    const guests = managedGuests(row);
    if (guests.length === 0) {
      if (row.attending) yes += 1;
      else no += 1;
      continue;
    }

    const declined = guests.filter((guest) => !guest.attending).length;
    const coming = guests.length - declined;
    no += declined;
    people += coming;
    if (coming > 0) yes += 1;
  }

  return { yes, no, people };
}

function getRsvp(id: number) {
  return getDb().prepare("SELECT * FROM rsvps WHERE id = ?").get(id) as RsvpRow | undefined;
}

function mealValue(guests: ManagedGuest[]) {
  if (guests.length === 1) return guests[0].meal;
  return JSON.stringify(guests.map((guest) => guest.meal));
}

function writeAttendance(id: number, guests: ManagedGuest[]) {
  const coming = guests.filter((guest) => guest.attending).length;
  getDb()
    .prepare(
      `UPDATE rsvps
       SET guest_flags = @flags, guest_count = @guestCount, attending = @attending
       WHERE id = @id`,
    )
    .run({
      id,
      flags: JSON.stringify(guests.map((guest) => guest.attending)),
      guestCount: coming,
      attending: coming > 0 ? 1 : 0,
    });
}

function writeGuests(id: number, guests: ManagedGuest[]) {
  const coming = guests.filter((guest) => guest.attending).length;
  getDb()
    .prepare(
      `UPDATE rsvps
       SET guest_names = @guestNames, meal = @meal, guest_flags = @flags,
           guest_count = @guestCount, attending = @attending
       WHERE id = @id`,
    )
    .run({
      id,
      guestNames: guests.map((guest) => guest.name).join("\n"),
      meal: mealValue(guests),
      flags: JSON.stringify(guests.map((guest) => guest.attending)),
      guestCount: coming,
      attending: coming > 0 ? 1 : 0,
    });
}

function deleteRsvpRow(id: number) {
  return getDb().prepare("DELETE FROM rsvps WHERE id = ?").run(id).changes > 0;
}

export function setGuestAttendance(id: number, index: number, attending: boolean) {
  const row = getRsvp(id);
  if (!row) return { ok: false as const, error: "Diese Antwort gibt es nicht mehr." };
  const guests = managedGuests(row);
  if (!Number.isInteger(index) || index < 0 || index >= guests.length) {
    return { ok: false as const, error: "Diesen Gast gibt es in der Antwort nicht." };
  }

  writeAttendance(
    id,
    guests.map((guest, guestIndex) => (guestIndex === index ? { ...guest, attending } : guest)),
  );
  return { ok: true as const };
}

export function setPartyAttendance(id: number, attending: boolean) {
  const row = getRsvp(id);
  if (!row) return { ok: false as const, error: "Diese Antwort gibt es nicht mehr." };
  const guests = managedGuests(row);
  if (guests.length === 0) {
    return { ok: false as const, error: "Für diese Antwort sind keine Gäste gespeichert." };
  }

  writeAttendance(
    id,
    guests.map((guest) => ({ ...guest, attending })),
  );
  return { ok: true as const };
}

export function removeGuest(id: number, index: number) {
  const row = getRsvp(id);
  if (!row) return { ok: false as const, error: "Diese Antwort gibt es nicht mehr." };
  const guests = managedGuests(row);
  if (!Number.isInteger(index) || index < 0 || index >= guests.length) {
    return { ok: false as const, error: "Diesen Gast gibt es in der Antwort nicht." };
  }

  const remaining = guests.filter((_, guestIndex) => guestIndex !== index);
  if (remaining.length === 0) {
    deleteRsvpRow(id);
    return { ok: true as const };
  }

  writeGuests(id, remaining);
  return { ok: true as const };
}

export function deleteRsvp(id: number) {
  if (!deleteRsvpRow(id)) {
    return { ok: false as const, error: "Diese Antwort gibt es nicht mehr." };
  }
  return { ok: true as const };
}
