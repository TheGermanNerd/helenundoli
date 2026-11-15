export const MEALS = [
  { value: "fleisch", label: "Fleisch" },
  { value: "fisch", label: "Fisch" },
  { value: "vegetarisch", label: "Vegetarisch" },
  { value: "vegan", label: "Vegan" },
  { value: "offen", label: "Noch offen" },
] as const;

export type Meal = (typeof MEALS)[number]["value"];

export type Guest = {
  firstName: string;
  lastName: string;
  meal: Meal;
};

export type NewRsvp = {
  name: string;
  email: string;
  attending: boolean;
  guestCount: number;
  guestNames: string | null;
  meal: string | null;
  message: string | null;
};

export type ParseResult =
  | { status: "ignored" }
  | { status: "ok"; value: NewRsvp }
  | { status: "error"; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function cleanLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanBlock(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function isMeal(value: string): value is Meal {
  return MEALS.some((meal) => meal.value === value);
}

function mealName(value: string) {
  return MEALS.find((meal) => meal.value === value)?.label ?? null;
}

export function mealLabel(value: string | null) {
  if (!value) return "—";
  const single = mealName(value);
  if (single) return single;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return "—";
    return parsed.map((item) => (typeof item === "string" ? (mealName(item) ?? "—") : "—")).join("\n");
  } catch {
    return "—";
  }
}

export type ManagedGuest = {
  name: string;
  meal: Meal | null;
  attending: boolean;
};

export type GuestSource = {
  attending: number;
  guest_count: number;
  guest_names: string | null;
  meal: string | null;
  guest_flags: string | null;
};

function parseFlags(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    if (!parsed.every((item) => typeof item === "boolean")) return null;
    return parsed;
  } catch {
    return null;
  }
}

function splitGuestNames(raw: string | null, expected: number) {
  const value = (raw ?? "").replace(/\r\n/g, "\n").trim();
  if (!value) return [];

  if (value.includes("\n")) {
    return value.split("\n").map((part) => part.trim()).filter(Boolean);
  }

  const commas = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (commas.length > 1 && (expected <= 0 || commas.length === expected)) return commas;
  return [value];
}

function mealsForCount(value: string | null, count: number): (Meal | null)[] {
  if (count === 0) return [];
  if (!value) return Array.from({ length: count }, () => null);
  if (isMeal(value)) return Array.from({ length: count }, () => value);

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return Array.from({ length: count }, (_, index) => {
        const item = parsed[index];
        return typeof item === "string" && isMeal(item) ? item : null;
      });
    }
  } catch {
    // Older answers may store a meal the current list does not know.
  }

  return Array.from({ length: count }, () => null);
}

export function managedGuests(row: GuestSource): ManagedGuest[] {
  const flags = parseFlags(row.guest_flags);
  const expected = flags?.length ?? (row.guest_count > 0 ? row.guest_count : 0);
  const names = splitGuestNames(row.guest_names, expected);
  if (names.length === 0) return [];

  const meals = mealsForCount(row.meal, names.length);
  const aligned = flags && flags.length === names.length ? flags : null;
  return names.map((name, index) => ({
    name,
    meal: meals[index] ?? null,
    attending: aligned ? aligned[index] : row.attending === 1,
  }));
}

export function attendingMealLabel(guests: ManagedGuest[]) {
  const labels = guests
    .filter((guest) => guest.attending)
    .map((guest) => (guest.meal ? mealName(guest.meal) ?? "—" : "—"));
  if (labels.length === 0) return "—";
  if (labels.every((label) => label === labels[0])) return labels[0];
  return labels.join("\n");
}

export function exportGuestNames(guests: ManagedGuest[]) {
  return guests.map((guest) => (guest.attending ? guest.name : `${guest.name} (abgesagt)`)).join("\n");
}

function guestLine(guest: Guest) {
  return [guest.firstName, guest.lastName].filter(Boolean).join(" ");
}

function readGuests(
  input: Record<string, unknown>,
  guestCount: number,
): { ok: false; error: string } | { ok: true; guestNames: string; meal: string } {
  const raw = input.guests;
  if (!Array.isArray(raw) || raw.length !== guestCount) {
    return { ok: false, error: "Bitte gebt für jede Person einen Menüwunsch an." };
  }

  const guests: Guest[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    if (!isRecord(item)) {
      return { ok: false, error: "Bitte gebt für jede Person einen Menüwunsch an." };
    }

    const firstName = cleanLine(readString(item, "firstName"));
    const lastName = cleanLine(readString(item, "lastName"));
    if (!firstName) {
      return { ok: false, error: `Bitte gebt den Vornamen von Gast ${index + 1} an.` };
    }
    if (firstName.length > 80) {
      return { ok: false, error: `Der Vorname von Gast ${index + 1} ist zu lang.` };
    }
    if (lastName.length > 80) {
      return { ok: false, error: `Der Nachname von Gast ${index + 1} ist zu lang.` };
    }

    const meal = readString(item, "meal");
    if (!isMeal(meal)) {
      return { ok: false, error: `Bitte wählt ein Menü für Gast ${index + 1}.` };
    }

    guests.push({ firstName, lastName, meal });
  }

  const guestNames = guests.map(guestLine).join("\n");
  if (guestNames.length > 4000) {
    return { ok: false, error: "Die Namen sind zu lang." };
  }

  return {
    ok: true,
    guestNames,
    meal: guests.length === 1 ? guests[0].meal : JSON.stringify(guests.map((guest) => guest.meal)),
  };
}

export function parseRsvp(input: unknown): ParseResult {
  if (!isRecord(input)) {
    return { status: "error", error: "Die Antwort konnte nicht gelesen werden." };
  }

  if (cleanLine(readString(input, "fax")).length > 0) {
    return { status: "ignored" };
  }

  const firstName = cleanLine(readString(input, "firstName"));
  const lastName = cleanLine(readString(input, "lastName"));
  if (!firstName) {
    return { status: "error", error: "Bitte gebt einen Vornamen an." };
  }
  if (firstName.length > 80) {
    return { status: "error", error: "Der Vorname ist zu lang." };
  }
  if (lastName.length > 80) {
    return { status: "error", error: "Der Nachname ist zu lang." };
  }
  const name = [firstName, lastName].filter(Boolean).join(" ");

  const email = cleanLine(readString(input, "email"));
  if (email && (!EMAIL.test(email) || email.length > 254)) {
    return { status: "error", error: "Bitte gebt eine gültige E-Mail-Adresse an." };
  }

  if (typeof input.attending !== "boolean") {
    return { status: "error", error: "Bitte sagt uns, ob ihr kommt." };
  }

  const message = cleanBlock(readString(input, "message"));
  if (message.length > 2000) {
    return { status: "error", error: "Die Nachricht ist zu lang." };
  }

  if (!input.attending) {
    return {
      status: "ok",
      value: {
        name,
        email,
        attending: false,
        guestCount: 0,
        guestNames: null,
        meal: null,
        message: message || null,
      },
    };
  }

  const guestCount = input.guestCount;
  if (typeof guestCount !== "number" || !Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20) {
    return { status: "error", error: "Die Anzahl Personen liegt zwischen 1 und 20." };
  }

  const guests = readGuests(input, guestCount);
  if (!guests.ok) {
    return { status: "error", error: guests.error };
  }

  return {
    status: "ok",
    value: {
      name,
      email,
      attending: true,
      guestCount,
      guestNames: guests.guestNames,
      meal: guests.meal,
      message: message || null,
    },
  };
}
