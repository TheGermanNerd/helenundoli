import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SERVER_DIR = "/var/www/helenundoli";
const SERVER_ONLY = "Das Aktualisieren geht nur auf dem Server.";
const BRANCH_NAME = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/;
const START_GRACE_MS = 20_000;
const LOCK_STALE_MS = 10_000;

const STATES = new Set(["running", "restarting", "done", "error"]);
const PHASES = new Set(["fetch", "install", "build", "restart"]);

export type DeployPhase = "fetch" | "install" | "build" | "restart";
export type DeployState = "idle" | "running" | "restarting" | "done" | "error";

export type DeployInfo = {
  allowed: boolean;
  reason: string | null;
  branch: string | null;
  targetBranch: string;
  commit: string | null;
  subject: string | null;
  update: {
    state: DeployState;
    phase: DeployPhase | null;
    message: string | null;
    startedAt: string | null;
    finishedAt: string | null;
  };
};

type StoredUpdate = {
  state: Exclude<DeployState, "idle">;
  phase: DeployPhase | null;
  message: string | null;
  commit: string | null;
  branch: string | null;
  pid: number | null;
  scriptPid: number | null;
  startedAt: string | null;
  finishedAt: string | null;
};

export type DeployResult = { ok: true } | { ok: false; error: string; status: number };

export function validBranch(name: string) {
  return (
    BRANCH_NAME.test(name) &&
    !name.includes("..") &&
    !name.includes("//") &&
    !name.includes("@") &&
    !name.endsWith("/") &&
    !name.endsWith(".lock")
  );
}

function dataPath(name: string) {
  return path.join(process.cwd(), "data", name);
}

function gitOutput(args: string[]) {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function currentBranch() {
  const name = gitOutput(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!name || name === "HEAD") return null;
  return name.slice(0, 200);
}

function currentCommit() {
  const commit = gitOutput(["rev-parse", "--short=12", "HEAD"]);
  return commit ? commit.slice(0, 40) : null;
}

function currentSubject() {
  const subject = gitOutput(["log", "-1", "--format=%s"]);
  return subject ? subject.slice(0, 200) : null;
}

function readTarget(branch: string | null) {
  try {
    const saved = fs.readFileSync(dataPath("deploy-branch"), "utf8").trim();
    if (validBranch(saved)) return saved;
  } catch {
    // No saved branch yet.
  }
  if (branch && validBranch(branch)) return branch;
  return "main";
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function pid(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 1) return null;
  return value;
}

function readStored(): StoredUpdate | null {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(dataPath("update-status.json"), "utf8"));
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record.state !== "string" || !STATES.has(record.state)) return null;
    const phase = typeof record.phase === "string" && PHASES.has(record.phase) ? (record.phase as DeployPhase) : null;
    return {
      state: record.state as StoredUpdate["state"],
      phase,
      message: text(record.message, 500),
      commit: text(record.commit, 40),
      branch: text(record.branch, 128),
      pid: pid(record.pid),
      scriptPid: pid(record.scriptPid),
      startedAt: text(record.startedAt, 40),
      finishedAt: text(record.finishedAt, 40),
    };
  } catch {
    return null;
  }
}

function writeStored(status: StoredUpdate) {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "update-status.json");
  const temporary = path.join(dir, ".update-status.json.tmp");
  fs.writeFileSync(temporary, JSON.stringify(status) + "\n", { mode: 0o644 });
  fs.renameSync(temporary, file);
}

function alive(processId: number) {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "";
    return code === "EPERM";
  }
}

function fresh(startedAt: string | null) {
  if (!startedAt) return false;
  const time = Date.parse(startedAt);
  if (Number.isNaN(time)) return false;
  return Date.now() - time < START_GRACE_MS;
}

function reconcile(stored: StoredUpdate | null) {
  if (!stored) return null;
  if (stored.state === "restarting" && stored.pid !== null && stored.pid !== process.pid) {
    const done: StoredUpdate = {
      ...stored,
      state: "done",
      phase: null,
      message: "Die Website läuft mit dem Stand von GitHub.",
      finishedAt: new Date().toISOString(),
    };
    writeStored(done);
    return done;
  }
  if (stored.state === "running" && !(stored.scriptPid !== null && alive(stored.scriptPid)) && !(stored.scriptPid === null && fresh(stored.startedAt))) {
    const interrupted: StoredUpdate = {
      ...stored,
      state: "error",
      phase: null,
      message: "Die Aktualisierung wurde unterbrochen.",
      finishedAt: new Date().toISOString(),
    };
    writeStored(interrupted);
    return interrupted;
  }
  return stored;
}

function updating(stored: StoredUpdate | null) {
  if (!stored) return false;
  if (stored.state === "restarting" && stored.pid === process.pid) return true;
  if (stored.state !== "running") return false;
  if (stored.scriptPid !== null && alive(stored.scriptPid)) return true;
  return stored.scriptPid === null && fresh(stored.startedAt);
}

function currentDir() {
  const cwd = process.cwd();
  return cwd.endsWith("/") || cwd.endsWith("\\") ? cwd.slice(0, -1) : cwd;
}

export function updatesAllowed() {
  return process.env.NODE_ENV === "production" && currentDir() === SERVER_DIR;
}

export function deployInfo(): DeployInfo {
  const branch = currentBranch();
  const stored = reconcile(readStored());
  return {
    allowed: updatesAllowed(),
    reason: updatesAllowed() ? null : SERVER_ONLY,
    branch,
    targetBranch: readTarget(branch),
    commit: currentCommit(),
    subject: currentSubject(),
    update: stored
      ? {
          state: stored.state,
          phase: stored.phase,
          message: stored.message,
          startedAt: stored.startedAt,
          finishedAt: stored.finishedAt,
        }
      : {
          state: "idle",
          phase: null,
          message: null,
          startedAt: null,
          finishedAt: null,
        },
  };
}

export function saveBranch(name: string): DeployResult {
  const branch = name.trim();
  if (!validBranch(branch)) {
    return { ok: false, status: 400, error: "Der Branch-Name ist ungültig." };
  }
  if (updating(reconcile(readStored()))) {
    return { ok: false, status: 409, error: "Während einer Aktualisierung bleibt der Branch unverändert." };
  }
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "deploy-branch");
  const temporary = path.join(dir, ".deploy-branch.tmp");
  fs.writeFileSync(temporary, branch + "\n", { mode: 0o644 });
  fs.renameSync(temporary, file);
  return { ok: true };
}

function acquireLock() {
  const lock = dataPath("update.lock");
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  try {
    return fs.openSync(lock, "wx");
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "";
    if (code !== "EEXIST") throw error;
    const age = Date.now() - fs.statSync(lock).mtimeMs;
    if (age < LOCK_STALE_MS) return null;
    fs.rmSync(lock, { force: true });
    return fs.openSync(lock, "wx");
  }
}

function releaseLock(fd: number) {
  fs.closeSync(fd);
  fs.rmSync(dataPath("update.lock"), { force: true });
}

export function startUpdate(): DeployResult {
  if (!updatesAllowed()) {
    return { ok: false, status: 403, error: SERVER_ONLY };
  }
  const script = path.join(process.cwd(), "deploy", "apply-update.sh");
  if (!fs.existsSync(script)) {
    return { ok: false, status: 500, error: "Das Update-Skript fehlt auf dem Server." };
  }

  const lock = acquireLock();
  if (lock === null) {
    return { ok: false, status: 409, error: "Es läuft schon eine Aktualisierung." };
  }

  let claimed: StoredUpdate;
  try {
    if (updating(reconcile(readStored()))) {
      return { ok: false, status: 409, error: "Es läuft schon eine Aktualisierung." };
    }
    claimed = {
      state: "running",
      phase: "fetch",
      message: "Die Aktualisierung startet…",
      commit: null,
      branch: readTarget(currentBranch()),
      pid: null,
      scriptPid: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    };
    writeStored(claimed);
  } finally {
    releaseLock(lock);
  }

  const failed: StoredUpdate = {
    ...claimed,
    state: "error",
    phase: null,
    message: "Die Aktualisierung konnte nicht gestartet werden.",
    finishedAt: new Date().toISOString(),
  };

  try {
    const env = { ...process.env };
    delete env.HELENUNDOLI_APPLY_ONLY;
    delete env.HELENUNDOLI_APPLY_SNAPSHOT;
    delete env.HELENUNDOLI_UPDATE_SNAPSHOT;
    env.HELENUNDOLI_SERVICE_PID = String(process.pid);
    const child = spawn("bash", [script], {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
      env,
    });
    child.once("error", () => {
      writeStored({ ...failed, finishedAt: new Date().toISOString() });
    });
    child.unref();
  } catch {
    writeStored(failed);
    return { ok: false, status: 500, error: failed.message ?? "Die Aktualisierung konnte nicht gestartet werden." };
  }

  return { ok: true };
}
