export const TASK_LIMIT = 5;

const NAME_MIN = 2;
const NAME_MAX = 40;
const TITLE_MAX = 80;
const TEXT_MAX = 400;
const PRIZE_TEXT_MAX = 500;
const POINTS_MAX = 100;
const GOAL_MAX = 500;

export type ParsedName = { ok: true; name: string } | { ok: false; error: string };

export type ParsedTask = { ok: true; title: string; instruction: string; points: number } | { ok: false; error: string };

export type ParsedSettings =
  | { ok: true; prizeTitle: string; prizeText: string; goalPoints: number }
  | { ok: false; error: string };

export function pointsLabel(points: number) {
  return `${points} ${points === 1 ? "Punkt" : "Punkte"}`;
}

export function parseName(value: unknown): ParsedName {
  if (typeof value !== "string") return { ok: false, error: "Bitte einen Namen eintragen." };
  const name = value.replace(/[\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim();
  if (name.length < NAME_MIN) return { ok: false, error: "Der Name braucht mindestens 2 Zeichen." };
  if (name.length > NAME_MAX) return { ok: false, error: "Der Name darf höchstens 40 Zeichen haben." };
  return { ok: true, name };
}

export function parseTaskFields(input: { title: unknown; instruction: unknown; points: unknown }): ParsedTask {
  const title = parseLine(input.title, "Bitte einen Titel eintragen.", `Der Titel darf höchstens ${TITLE_MAX} Zeichen haben.`, TITLE_MAX);
  if (!title.ok) return title;

  const instruction = parseBlock(
    input.instruction,
    "Bitte kurz beschreiben, was zu tun ist.",
    `Die Beschreibung darf höchstens ${TEXT_MAX} Zeichen haben.`,
    TEXT_MAX,
  );
  if (!instruction.ok) return instruction;

  const points = parseWhole(input.points, 1, POINTS_MAX);
  if (points === null) return { ok: false, error: "Die Punkte müssen eine ganze Zahl von 1 bis 100 sein." };

  return { ok: true, title: title.value, instruction: instruction.value, points };
}

export function parseSettings(input: { prizeTitle: unknown; prizeText: unknown; goalPoints: unknown }): ParsedSettings {
  const prizeTitle = parseLine(
    input.prizeTitle,
    "Bitte einen Namen für den Preis eintragen.",
    `Der Name des Preises darf höchstens ${TITLE_MAX} Zeichen haben.`,
    TITLE_MAX,
  );
  if (!prizeTitle.ok) return prizeTitle;

  if (typeof input.prizeText !== "string") return { ok: false, error: "Der Preistext konnte nicht gelesen werden." };
  const prizeText = cleanBlock(input.prizeText);
  if (prizeText.length > PRIZE_TEXT_MAX) {
    return { ok: false, error: `Der Preistext darf höchstens ${PRIZE_TEXT_MAX} Zeichen haben.` };
  }

  const goalPoints = parseWhole(input.goalPoints, 1, GOAL_MAX);
  if (goalPoints === null) return { ok: false, error: "Das Ziel muss eine ganze Zahl von 1 bis 500 sein." };

  return { ok: true, prizeTitle: prizeTitle.value, prizeText, goalPoints };
}

export function isTaskToken(value: string) {
  return /^[A-Za-z0-9_-]{20,128}$/.test(value);
}

function parseLine(value: unknown, emptyError: string, longError: string, max: number) {
  if (typeof value !== "string") return { ok: false as const, error: emptyError };
  const cleaned = value.replace(/[\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return { ok: false as const, error: emptyError };
  if (cleaned.length > max) return { ok: false as const, error: longError };
  return { ok: true as const, value: cleaned };
}

function parseBlock(value: unknown, emptyError: string, longError: string, max: number) {
  if (typeof value !== "string") return { ok: false as const, error: emptyError };
  const cleaned = cleanBlock(value);
  if (!cleaned) return { ok: false as const, error: emptyError };
  if (cleaned.length > max) return { ok: false as const, error: longError };
  return { ok: true as const, value: cleaned };
}

function cleanBlock(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();
}

function parseWhole(value: unknown, min: number, max: number) {
  let numeric: number;
  if (typeof value === "number") numeric = value;
  else if (typeof value === "string" && /^-?\d+$/.test(value.trim())) numeric = Number(value.trim());
  else return null;
  if (!Number.isInteger(numeric) || numeric < min || numeric > max) return null;
  return numeric;
}
