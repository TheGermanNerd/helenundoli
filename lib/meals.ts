import { getDb } from "@/lib/db";
import type { MealOption } from "@/lib/rsvp";

export function listMealOptions() {
  return getDb()
    .prepare(
      `SELECT value, label
       FROM meal_options
       WHERE active = 1
       ORDER BY position ASC, value ASC`,
    )
    .all() as MealOption[];
}

export function listMealCatalog() {
  return getDb()
    .prepare(
      `SELECT value, label
       FROM meal_options
       ORDER BY position ASC, value ASC`,
    )
    .all() as MealOption[];
}

function slugify(label: string) {
  const folded = label
    .toLocaleLowerCase("de")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const slug = folded
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return slug || "menu";
}

function allocateValue(label: string, reserved: Set<string>, inactive: MealOption[]) {
  const match = inactive.find(
    (meal) => !reserved.has(meal.value) && meal.label.toLocaleLowerCase("de") === label.toLocaleLowerCase("de"),
  );
  if (match) return match.value;

  const base = slugify(label);
  if (!reserved.has(base)) return base;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base.slice(0, 36)}-${index}`;
    if (!reserved.has(candidate)) return candidate;
  }
  return `${base.slice(0, 20)}-${Date.now().toString(36)}`;
}

export function saveMealOptions(meals: MealOption[]) {
  const database = getDb();
  const known = database.prepare("SELECT value FROM meal_options").all() as { value: string }[];
  const knownValues = new Set(known.map((row) => row.value));
  for (const meal of meals) {
    if (meal.value && !knownValues.has(meal.value)) {
      return { ok: false as const, error: "Ein Menü gibt es nicht mehr. Bitte ladet die Seite neu." };
    }
  }

  const inactive = database
    .prepare("SELECT value, label FROM meal_options WHERE active = 0")
    .all() as MealOption[];

  const apply = database.transaction((next: MealOption[]) => {
    const reserved = new Set(next.flatMap((meal) => (meal.value ? [meal.value] : [])));
    const rows = next.map((meal, position) => {
      const value = meal.value || allocateValue(meal.label, reserved, inactive);
      reserved.add(value);
      return { value, label: meal.label, position };
    });

    const upsert = database.prepare(
      `INSERT INTO meal_options (value, label, position, active)
       VALUES (@value, @label, @position, 1)
       ON CONFLICT(value) DO UPDATE SET
         label = excluded.label,
         position = excluded.position,
         active = 1`,
    );
    for (const row of rows) upsert.run(row);

    const keep = rows.map((row) => row.value);
    database.prepare(`UPDATE meal_options SET active = 0 WHERE value NOT IN (${keep.map(() => "?").join(", ")})`).run(...keep);
  });

  apply(meals);
  return { ok: true as const };
}
