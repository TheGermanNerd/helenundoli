import { getDb } from "@/lib/db";

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
