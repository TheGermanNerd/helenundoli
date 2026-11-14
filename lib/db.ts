import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { NewRsvp } from "@/lib/rsvp";

export type RsvpRow = {
  id: number;
  name: string;
  email: string;
  attending: number;
  guest_count: number;
  guest_names: string | null;
  meal: string | null;
  message: string | null;
  created_at: string;
};

const globalForDb = globalThis as unknown as {
  __rsvpDb?: Database.Database;
  __schemaVersion?: number;
};

const SCHEMA_VERSION = 4;

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
      enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1))
    );
  `);
  const columns = database.prepare("PRAGMA table_info(game_settings)").all() as { name: string }[];
  if (!columns.some((column) => column.name === "enabled")) {
    database.exec(
      "ALTER TABLE game_settings ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1))",
    );
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
  const yes = getDb().prepare("SELECT COUNT(*) AS n FROM rsvps WHERE attending = 1").get() as { n: number };
  const no = getDb().prepare("SELECT COUNT(*) AS n FROM rsvps WHERE attending = 0").get() as { n: number };
  const people = getDb()
    .prepare("SELECT COALESCE(SUM(guest_count), 0) AS n FROM rsvps WHERE attending = 1")
    .get() as { n: number };

  return { yes: yes.n, no: no.n, people: people.n };
}
