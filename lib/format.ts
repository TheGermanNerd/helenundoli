const BERLIN = "Europe/Berlin";

export function formatTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: BERLIN,
  }).format(date);
}

export function formatDateTimeLocal(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = berlinWallClock(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function parseBerlinDateTime(value: string): { ok: true; iso: string } | { ok: false; error: string } {
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) return { ok: false, error: "Diese Uhrzeit konnten wir nicht lesen." };

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return { ok: false, error: "Diese Uhrzeit konnten wir nicht lesen." };
  }

  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let instant = wallAsUtc - berlinOffsetMs(wallAsUtc);
  const corrected = wallAsUtc - berlinOffsetMs(instant);
  if (corrected !== instant) instant = corrected;

  if (formatDateTimeLocal(new Date(instant).toISOString()) !== trimmed) {
    return { ok: false, error: "Diese Uhrzeit gibt es nicht." };
  }
  if (instant <= Date.now()) {
    return { ok: false, error: "Die Uhrzeit muss in der Zukunft liegen." };
  }
  return { ok: true, iso: new Date(instant).toISOString() };
}

function berlinWallClock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BERLIN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  let hour = pick("hour");
  if (hour === "24") hour = "00";
  return { year: pick("year"), month: pick("month"), day: pick("day"), hour, minute: pick("minute") };
}

function berlinOffsetMs(utcMs: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BERLIN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcMs));
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "0";
  let day = Number(pick("day"));
  let hour = Number(pick("hour"));
  if (hour === 24) {
    hour = 0;
    day += 1;
  }
  const asUtc = Date.UTC(Number(pick("year")), Number(pick("month")) - 1, day, hour, Number(pick("minute")), Number(pick("second")));
  return asUtc - utcMs;
}

export function csvEscape(value: string) {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
