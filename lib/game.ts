import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { isTaskToken, parseSettings, parseTaskFields, TASK_LIMIT, type ParsedSettings, type ParsedTask } from "@/lib/game-input";
import { PLAYER_COOKIE } from "@/lib/legal";

export { PLAYER_COOKIE };

const PLAYER_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type GameSettings = {
  prizeTitle: string;
  prizeText: string;
  goalPoints: number;
  enabled: boolean;
};

export type GameTaskView = {
  id: number;
  title: string;
  instruction: string;
  points: number;
  done: boolean;
};

export type LeaderboardRow = {
  name: string;
  points: number;
  you: boolean;
};

export type GameView = {
  playerName: string | null;
  tasks: GameTaskView[];
  score: number;
  settings: GameSettings;
  leaderboard: LeaderboardRow[];
  prizeUnlocked: boolean;
};

export type AdminTask = {
  id: number;
  position: number;
  title: string;
  instruction: string;
  points: number;
  token: string;
};

export type AdminPlayer = {
  id: number;
  name: string;
  points: number;
  createdAt: string;
};

export type SaveResult = { ok: true } | { ok: false; error: string; status?: number };

export type ClaimPreview =
  | { status: "unknown" }
  | {
      status: "ready";
      title: string;
      instruction: string;
      points: number;
      playerName: string | null;
      already: boolean;
    };

export type ClaimOutcome =
  | { status: "unknown" }
  | { status: "other" }
  | { status: "ok" | "already"; title: string; points: number; score: number };

type TaskRow = {
  id: number;
  position: number;
  title: string;
  instruction: string;
  points: number;
  token: string;
};

type StandingRow = {
  id: number;
  name: string;
  points: number;
  created_at: string;
};

const FALLBACK_SETTINGS: GameSettings = {
  prizeTitle: "Der Preis",
  prizeText: "Du hast genug Punkte für den Preis.",
  goalPoints: 10,
  enabled: true,
};

export function playerCookie(token: string) {
  return {
    name: PLAYER_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PLAYER_MAX_AGE_SECONDS,
  };
}

export function getGameView(playerToken: string | null): GameView {
  const player = playerToken ? getPlayerByToken(playerToken) : null;
  const tasks = listTaskRows();
  const done = new Set(player ? completedTaskIds(player.id) : []);
  const viewTasks = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    instruction: task.instruction,
    points: task.points,
    done: done.has(task.id),
  }));
  const score = viewTasks.reduce((sum, task) => sum + (task.done ? task.points : 0), 0);
  const settings = getSettings();
  const board = standings();

  return {
    playerName: player?.name ?? null,
    tasks: viewTasks,
    score,
    settings,
    leaderboard: board.map((row) => ({
      name: row.name,
      points: row.points,
      you: player?.id === row.id,
    })),
    prizeUnlocked: player !== null && score >= settings.goalPoints,
  };
}

export function getClaimPreview(playerToken: string | null, taskToken: string): ClaimPreview {
  const task = findTaskByToken(taskToken);
  if (!task) return { status: "unknown" };
  const player = playerToken ? getPlayerByToken(playerToken) : null;
  const already = player ? hasCompletion(player.id, task.id) : false;
  return {
    status: "ready",
    title: task.title,
    instruction: task.instruction,
    points: task.points,
    playerName: player?.name ?? null,
    already,
  };
}

export function scannedTaskFit(taskToken: string, expectedTaskId: number): "unknown" | "other" | "match" {
  const task = findTaskByToken(taskToken);
  if (!task) return "unknown";
  if (task.id !== expectedTaskId) return "other";
  return "match";
}

export function claimTask(playerToken: string, taskToken: string, expectedTaskId?: number): ClaimOutcome {
  const task = findTaskByToken(taskToken);
  const player = getPlayerByToken(playerToken);
  if (!task || !player) return { status: "unknown" };
  if (expectedTaskId !== undefined && task.id !== expectedTaskId) return { status: "other" };

  try {
    getDb()
      .prepare("INSERT INTO game_completions (player_id, task_id, created_at) VALUES (?, ?, ?)")
      .run(player.id, task.id, new Date().toISOString());
  } catch (error) {
    if (!isConstraint(error)) throw error;
    return { status: "already", title: task.title, points: task.points, score: playerScore(player.id) };
  }

  return { status: "ok", title: task.title, points: task.points, score: playerScore(player.id) };
}

export function createPlayer(name: string): { ok: true; token: string; name: string } | { ok: false; error: string } {
  const db = getDb();
  const insert = db.prepare("INSERT INTO game_players (token, name, created_at) VALUES (?, ?, ?)");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = randomBytes(32).toString("base64url");
    try {
      insert.run(token, name, new Date().toISOString());
      return { ok: true, token, name };
    } catch (error) {
      if (!isConstraint(error)) throw error;
    }
  }
  return { ok: false, error: "Das Profil konnte nicht angelegt werden. Bitte noch einmal versuchen." };
}

export function renamePlayer(token: string, name: string): SaveResult {
  const info = getDb().prepare("UPDATE game_players SET name = ? WHERE token = ?").run(name, token);
  if (info.changes === 0) return { ok: false, error: "Das Profil gibt es nicht mehr.", status: 404 };
  return { ok: true };
}

export function getSettings(): GameSettings {
  const row = getDb()
    .prepare("SELECT prize_title, prize_text, goal_points, enabled FROM game_settings WHERE id = 1")
    .get() as { prize_title: string; prize_text: string; goal_points: number; enabled: number } | undefined;
  if (!row) return FALLBACK_SETTINGS;
  return {
    prizeTitle: row.prize_title,
    prizeText: row.prize_text,
    goalPoints: row.goal_points,
    enabled: row.enabled === 1,
  };
}

export function setGameEnabled(enabled: boolean): SaveResult {
  const info = getDb().prepare("UPDATE game_settings SET enabled = ? WHERE id = 1").run(enabled ? 1 : 0);
  if (info.changes === 0) return { ok: false, error: "Das Spiel konnte nicht umgestellt werden." };
  return { ok: true };
}

export function saveSettings(input: { prizeTitle: unknown; prizeText: unknown; goalPoints: unknown }): SaveResult {
  const parsed = parseSettings(input);
  if (!parsed.ok) return parsed;
  return writeSettings(parsed);
}

export function adminTasks(): AdminTask[] {
  return listTaskRows().map((task) => ({
    id: task.id,
    position: task.position,
    title: task.title,
    instruction: task.instruction,
    points: task.points,
    token: task.token,
  }));
}

export function adminPlayers(): AdminPlayer[] {
  return standings().map((row) => ({
    id: row.id,
    name: row.name,
    points: row.points,
    createdAt: row.created_at,
  }));
}

export function createTask(input: { title: unknown; instruction: unknown; points: unknown }): SaveResult {
  const parsed = parseTaskFields(input);
  if (!parsed.ok) return parsed;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return insertTask(parsed, randomBytes(32).toString("base64url"));
    } catch (error) {
      if (!isConstraint(error)) throw error;
    }
  }
  return { ok: false, error: "Die Aufgabe konnte nicht angelegt werden. Bitte noch einmal versuchen." };
}

export function updateTask(id: number, input: { title: unknown; instruction: unknown; points: unknown }): SaveResult {
  const parsed = parseTaskFields(input);
  if (!parsed.ok) return parsed;
  const info = getDb()
    .prepare("UPDATE game_tasks SET title = ?, instruction = ?, points = ? WHERE id = ?")
    .run(parsed.title, parsed.instruction, parsed.points, id);
  if (info.changes === 0) return { ok: false, error: "Die Aufgabe gibt es nicht mehr.", status: 404 };
  return { ok: true };
}

export function deleteTask(id: number): SaveResult {
  const db = getDb();
  const removed = db.transaction(() => {
    const info = db.prepare("DELETE FROM game_tasks WHERE id = ?").run(id);
    if (info.changes === 0) return false;
    const rows = db.prepare("SELECT id FROM game_tasks ORDER BY position ASC, id ASC").all() as { id: number }[];
    const update = db.prepare("UPDATE game_tasks SET position = ? WHERE id = ?");
    rows.forEach((row, index) => update.run(index + 1, row.id));
    return true;
  })();
  if (!removed) return { ok: false, error: "Die Aufgabe gibt es nicht mehr.", status: 404 };
  return { ok: true };
}

export function moveTask(id: number, direction: "up" | "down"): SaveResult {
  const db = getDb();
  const tasks = listTaskRows();
  const index = tasks.findIndex((task) => task.id === id);
  if (index < 0) return { ok: false, error: "Die Aufgabe gibt es nicht mehr.", status: 404 };
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= tasks.length) {
    return { ok: false, error: "Die Aufgabe lässt sich nicht weiter verschieben." };
  }
  const current = tasks[index];
  const other = tasks[swapWith];
  if (!current || !other) return { ok: false, error: "Die Aufgabe gibt es nicht mehr.", status: 404 };

  db.transaction(() => {
    const update = db.prepare("UPDATE game_tasks SET position = ? WHERE id = ?");
    update.run(other.position, current.id);
    update.run(current.position, other.id);
  })();
  return { ok: true };
}

export function deletePlayer(id: number): SaveResult {
  const info = getDb().prepare("DELETE FROM game_players WHERE id = ?").run(id);
  if (info.changes === 0) return { ok: false, error: "Den Spieler gibt es nicht mehr.", status: 404 };
  return { ok: true };
}

function writeSettings(parsed: Extract<ParsedSettings, { ok: true }>): SaveResult {
  try {
    getDb()
      .prepare(
        `INSERT INTO game_settings (id, prize_title, prize_text, goal_points)
         VALUES (1, @prizeTitle, @prizeText, @goalPoints)
         ON CONFLICT(id) DO UPDATE SET
           prize_title = excluded.prize_title,
           prize_text = excluded.prize_text,
           goal_points = excluded.goal_points`,
      )
      .run(parsed);
  } catch {
    return { ok: false, error: "Der Preis konnte nicht gespeichert werden." };
  }
  return { ok: true };
}

function insertTask(parsed: Extract<ParsedTask, { ok: true }>, token: string): SaveResult {
  const db = getDb();
  const outcome = db.transaction(() => {
    const count = (db.prepare("SELECT COUNT(*) AS n FROM game_tasks").get() as { n: number }).n;
    if (count >= TASK_LIMIT) return "limit" as const;
    const position =
      (db.prepare("SELECT COALESCE(MAX(position), 0) AS n FROM game_tasks").get() as { n: number }).n + 1;
    db.prepare(
      `INSERT INTO game_tasks (position, title, instruction, points, token, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(position, parsed.title, parsed.instruction, parsed.points, token, new Date().toISOString());
    return "ok" as const;
  })();
  if (outcome === "limit") return { ok: false, error: "Es sind höchstens fünf Aufgaben möglich." };
  return { ok: true };
}

function getPlayerByToken(token: string) {
  if (!isTaskToken(token)) return null;
  return (
    (getDb().prepare("SELECT id, name, token FROM game_players WHERE token = ?").get(token) as
      | { id: number; name: string; token: string }
      | undefined) ?? null
  );
}

function findTaskByToken(token: string) {
  if (!isTaskToken(token)) return null;
  return (
    (getDb()
      .prepare("SELECT id, title, instruction, points FROM game_tasks WHERE token = ?")
      .get(token) as { id: number; title: string; instruction: string; points: number } | undefined) ?? null
  );
}

function hasCompletion(playerId: number, taskId: number) {
  const row = getDb()
    .prepare("SELECT 1 AS n FROM game_completions WHERE player_id = ? AND task_id = ?")
    .get(playerId, taskId) as { n: number } | undefined;
  return Boolean(row);
}

function completedTaskIds(playerId: number) {
  const rows = getDb().prepare("SELECT task_id FROM game_completions WHERE player_id = ?").all(playerId) as {
    task_id: number;
  }[];
  return rows.map((row) => row.task_id);
}

function playerScore(playerId: number) {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(t.points), 0) AS n
       FROM game_completions c
       JOIN game_tasks t ON t.id = c.task_id
       WHERE c.player_id = ?`,
    )
    .get(playerId) as { n: number };
  return row.n;
}

function listTaskRows() {
  return getDb()
    .prepare(
      "SELECT id, position, title, instruction, points, token FROM game_tasks ORDER BY position ASC, id ASC",
    )
    .all() as TaskRow[];
}

function standings() {
  return getDb()
    .prepare(
      `SELECT p.id, p.name, p.created_at,
              COALESCE(SUM(t.points), 0) AS points,
              MAX(c.created_at) AS reached_at
       FROM game_players p
       LEFT JOIN game_completions c ON c.player_id = p.id
       LEFT JOIN game_tasks t ON t.id = c.task_id
       GROUP BY p.id, p.name, p.created_at
       ORDER BY points DESC,
                CASE WHEN MAX(c.created_at) IS NULL THEN 1 ELSE 0 END,
                MAX(c.created_at) ASC,
                p.created_at ASC,
                p.id ASC`,
    )
    .all() as StandingRow[];
}

function isConstraint(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && String(error.code).startsWith("SQLITE_CONSTRAINT");
}
