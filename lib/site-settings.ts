import { getDb } from "@/lib/db";

const MIN_ACCESS_MINUTES = 1;
const MAX_ACCESS_MINUTES = 1440;
const DEFAULT_ACCESS_MINUTES = 1440;

export function saveTheDateEnabled() {
  const row = getDb().prepare("SELECT save_the_date FROM site_settings WHERE id = 1").get() as
    | { save_the_date: number }
    | undefined;
  if (!row) return true;
  return row.save_the_date === 1;
}

export function setSaveTheDateEnabled(enabled: boolean): { ok: true } | { ok: false; error: string } {
  const info = getDb().prepare("UPDATE site_settings SET save_the_date = ? WHERE id = 1").run(enabled ? 1 : 0);
  if (info.changes === 0) return { ok: false, error: "Die Karte konnte nicht umgestellt werden." };
  return { ok: true };
}

export function accessTimeoutMinutes() {
  const row = getDb().prepare("SELECT access_minutes FROM site_settings WHERE id = 1").get() as
    | { access_minutes: number }
    | undefined;
  if (!row || !validAccessMinutes(row.access_minutes)) return DEFAULT_ACCESS_MINUTES;
  return row.access_minutes;
}

export function setAccessTimeoutMinutes(minutes: number): { ok: true } | { ok: false; error: string } {
  if (!validAccessMinutes(minutes)) {
    return { ok: false, error: "Die Dauer muss zwischen 1 und 1440 Minuten liegen." };
  }
  const info = getDb().prepare("UPDATE site_settings SET access_minutes = ? WHERE id = 1").run(minutes);
  if (info.changes === 0) return { ok: false, error: "Die Dauer konnte nicht gespeichert werden." };
  return { ok: true };
}

function validAccessMinutes(minutes: number) {
  return Number.isInteger(minutes) && minutes >= MIN_ACCESS_MINUTES && minutes <= MAX_ACCESS_MINUTES;
}
