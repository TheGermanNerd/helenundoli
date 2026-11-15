"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DeployInfo, DeployPhase } from "@/lib/deploy";
import type { ServerUsage, UsageSlice } from "@/lib/server-usage";

const updatePhases = [
  ["fetch", "Holen"],
  ["install", "Pakete"],
  ["build", "Bauen"],
  ["restart", "Neustart"],
] as const satisfies ReadonlyArray<readonly [DeployPhase, string]>;

const photoRows = [
  { key: "approved", label: "Freigegeben" },
  { key: "pending", label: "Wartend" },
  { key: "rejected", label: "Abgelehnt" },
] as const;

function isDeployInfo(value: unknown): value is DeployInfo {
  if (typeof value !== "object" || value === null || !("allowed" in value) || !("update" in value)) return false;
  const update = (value as { update?: unknown }).update;
  return typeof update === "object" && update !== null && "state" in update && "targetBranch" in value;
}

function GithubSection() {
  const [info, setInfo] = useState<DeployInfo | null>(null);
  const [draft, setDraft] = useState("");
  const [seen, setSeen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [offline, setOffline] = useState(false);
  const [action, setAction] = useState<"save" | "update" | null>(null);
  const target = info?.targetBranch ?? null;
  if (target !== null && seen !== target) {
    setSeen(target);
    setDraft(target);
  }

  const running = info?.update.state === "running" || info?.update.state === "restarting";
  const watch = running || offline;

  useEffect(() => {
    let stopped = false;
    let timer = 0;

    async function load() {
      try {
        const response = await fetch("/api/admin/deploy", { cache: "no-store" });
        const data: unknown = await response.json().catch(() => null);
        if (stopped) return;
        if (!response.ok || !isDeployInfo(data)) {
          const message =
            data && typeof data === "object" && "error" in data && typeof data.error === "string"
              ? data.error
              : "Der Stand konnte nicht geladen werden.";
          setLoadError(message);
          setOffline(false);
          return;
        }
        setInfo(data);
        setLoadError("");
        setOffline(false);
        if (data.update.state === "running" || data.update.state === "restarting") {
          timer = window.setTimeout(() => void load(), 2000);
        }
      } catch {
        if (stopped) return;
        setOffline(true);
        timer = window.setTimeout(() => void load(), 2000);
      }
    }

    void load();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [watch]);

  async function post(body: { action: "set-branch"; branch: string } | { action: "update" }) {
    setError("");
    setNotice("");
    const response = await fetch("/api/admin/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok || !isDeployInfo(data)) {
      const message =
        data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : "Das hat nicht geklappt.";
      setError(message);
      return false;
    }
    setInfo(data);
    return true;
  }

  const differs = info !== null && draft.trim() !== info.targetBranch;
  const busy = running || action !== null;

  return (
    <section className="border border-line bg-paper px-4 py-4" aria-busy={running || offline}>
      <h2 className="font-serif text-3xl text-bronze">GitHub</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Der Server übernimmt den gewählten Branch von GitHub, baut die Website neu und startet sie. Gästedaten, Fotos
        und die Zugangsdaten bleiben erhalten. Änderungen, die nur auf dem Server liegen, werden ersetzt. Die Seite ist
        beim Neustart kurz nicht erreichbar.
      </p>

      {info ? (
        <>
          <p className="mt-3 text-sm">
            {info.branch ? `Branch ${info.branch}` : "Kein Branch ausgecheckt"}
            {info.commit ? ` · ${info.commit}` : ""}
          </p>
          {info.subject ? <p className="mt-1 text-sm text-ink-soft">{info.subject}</p> : null}
        </>
      ) : (
        <p className="mt-3 text-sm text-ink-soft">{loadError || "Der Stand wird geladen…"}</p>
      )}

      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          setAction("save");
          void post({ action: "set-branch", branch: draft.trim() })
            .then((saved) => {
              if (saved) setNotice("Der Branch ist gespeichert.");
            })
            .catch(() => setError("Die Verbindung hat nicht geklappt. Bitte versucht es noch einmal."))
            .finally(() => setAction(null));
        }}
      >
        <div className="grow">
          <label htmlFor="deploy-branch" className="block text-sm font-medium">
            Branch
          </label>
          <input
            id="deploy-branch"
            value={draft}
            spellCheck={false}
            autoComplete="off"
            maxLength={128}
            disabled={!info || busy}
            onChange={(event) => {
              setDraft(event.target.value);
              setNotice("");
              setError("");
            }}
            className="mt-2 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={!info || busy || draft.trim().length === 0}
          className="rounded-xl border border-wine px-4 py-2.5 text-sm text-wine hover:bg-wine hover:text-paper disabled:opacity-60"
        >
          {action === "save" ? "Wird gespeichert…" : "Branch speichern"}
        </button>
      </form>

      {differs ? <p className="mt-2 text-sm text-ink-soft">Speichert den Branch, bevor ihr aktualisiert.</p> : null}
      {notice ? <p className="mt-2 text-sm text-olive">{notice}</p> : null}
      {info && !info.allowed && info.reason ? <p className="mt-3 text-sm text-ink-soft">{info.reason}</p> : null}

      <button
        type="button"
        disabled={!info || differs || busy}
        onClick={() => {
          setAction("update");
          void post({ action: "update" })
            .catch(() => setError("Die Verbindung hat nicht geklappt. Bitte versucht es noch einmal."))
            .finally(() => setAction(null));
        }}
        className="mt-4 rounded-xl bg-wine px-4 py-2.5 text-sm text-paper hover:bg-wine-deep disabled:opacity-60"
      >
        {running || action === "update" ? "Wird aktualisiert…" : "Von GitHub aktualisieren"}
      </button>

      {error || info?.update.state === "error" ? (
        <p role="alert" className="mt-3 border border-wine/30 bg-wine/5 px-3 py-2 text-sm text-wine">
          {error || info?.update.message}
        </p>
      ) : null}

      {offline ? (
        <p aria-live="polite" className="mt-3 text-sm">
          {info?.update.state === "restarting" || info?.update.phase === "restart"
            ? "Die Website startet neu…"
            : running
              ? "Die Website antwortet gerade nicht. Die Aktualisierung läuft weiter…"
              : "Der Stand konnte nicht geladen werden."}
        </p>
      ) : null}

      {info && (info.update.state === "running" || info.update.state === "restarting") && info.update.message ? (
        <p aria-live="polite" className="mt-3 text-sm">
          {info.update.message}
        </p>
      ) : null}

      {info?.update.state === "done" && info.update.message ? (
        <p aria-live="polite" className="mt-3 text-sm text-olive">
          {info.update.message}
        </p>
      ) : null}

      {running ? (
        <p className="mt-3 text-sm text-ink-soft">
          {updatePhases.map(([phase, label], index) => {
            const current = info?.update.phase === phase || (info?.update.state === "restarting" && phase === "restart");
            return (
              <span key={phase}>
                {index > 0 ? " · " : null}
                <span className={current ? "text-wine" : undefined}>{label}</span>
              </span>
            );
          })}
        </p>
      ) : null}

      {info?.update.logTail ? (
        <pre className="mt-3 max-h-48 overflow-auto border border-line bg-cream px-3 py-2 font-mono text-xs break-words whitespace-pre-wrap text-ink-soft">
          {info.update.logTail}
        </pre>
      ) : null}
    </section>
  );
}

export function AdminServer({ usage }: { usage: ServerUsage }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-10">
      <GithubSection />
      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => router.refresh())}
          className="rounded-xl border border-wine px-4 py-2 text-sm text-wine hover:bg-wine hover:text-paper disabled:opacity-60"
        >
          {pending ? "Wird geladen…" : "Aktualisieren"}
        </button>
      </div>

      <section className="border border-line bg-paper px-4 py-4">
        <h2 className="font-serif text-3xl text-bronze">Bilder</h2>
        <p className="mt-2 text-sm text-ink-soft">So viel Platz belegen die hochgeladenen Bilder auf diesem Server.</p>
        <p className="mt-3 text-sm">
          {formatBytes(usage.photos.total.bytes)} · {countLabel(usage.photos.total.count, "Bild", "Bilder")}
        </p>
        {usage.disk.total > 0 ? (
          <p className="mt-1 text-sm text-ink-soft">
            Das sind {formatPercent(usage.photos.total.bytes, usage.disk.total)} der Festplatte.
          </p>
        ) : null}
        <ul className="mt-4 space-y-2 text-sm">
          {photoRows.map((row) => (
            <UsageRow key={row.key} label={row.label} slice={usage.photos[row.key]} noun={["Bild", "Bilder"]} />
          ))}
          {usage.photos.orphans.count > 0 ? (
            <UsageRow label="Ohne Eintrag" slice={usage.photos.orphans} noun={["Datei", "Dateien"]} />
          ) : null}
        </ul>
      </section>

      <section className="border border-line bg-paper px-4 py-4">
        <h2 className="font-serif text-3xl text-bronze">Festplatte</h2>
        <p className="mt-2 text-sm text-ink-soft">Das Laufwerk, auf dem die Bilder liegen.</p>
        <p className="mt-3 text-sm">
          {formatBytes(usage.disk.used)} von {formatBytes(usage.disk.total)} belegt
        </p>
        <p className="mt-1 text-sm text-ink-soft">{formatBytes(usage.disk.free)} frei</p>
        <Meter used={usage.disk.used} total={usage.disk.total} label="Belegte Festplatte" />
      </section>

      <section className="border border-line bg-paper px-4 py-4">
        <h2 className="font-serif text-3xl text-bronze">Arbeitsspeicher</h2>
        <p className="mt-3 text-sm">
          {formatBytes(usage.memory.used)} von {formatBytes(usage.memory.total)} belegt
        </p>
        <p className="mt-1 text-sm text-ink-soft">{formatBytes(usage.memory.total - usage.memory.used)} frei</p>
        <Meter used={usage.memory.used} total={usage.memory.total} label="Belegter Arbeitsspeicher" />
      </section>

      <section className="border border-line bg-paper px-4 py-4">
        <h2 className="font-serif text-3xl text-bronze">Prozessor</h2>
        <p className="mt-2 text-sm text-ink-soft">Gemessen über die letzte Minute.</p>
        <p className="mt-3 text-sm">
          Last {formatLoad(usage.cpu.load)} bei {usage.cpu.cores} {usage.cpu.cores === 1 ? "Kern" : "Kernen"}
        </p>
        <Meter used={usage.cpu.load} total={usage.cpu.cores} label="Prozessorlast" />
      </section>
    </div>
  );
}

function UsageRow({
  label,
  slice,
  noun,
}: {
  label: string;
  slice: UsageSlice;
  noun: [string, string];
}) {
  return (
    <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
      <span>{label}</span>
      <span className="text-ink-soft">
        {formatBytes(slice.bytes)} · {countLabel(slice.count, noun[0], noun[1])}
      </span>
    </li>
  );
}

function Meter({ used, total, label }: { used: number; total: number; label: string }) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, used / total)) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <div
      className="mt-4 h-2 bg-line"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className="h-full bg-wine" style={{ width: `${percent}%` }} />
    </div>
  );
}

function formatBytes(bytes: number) {
  const safe = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = safe;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : 1;
  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)} ${units[unit]}`;
}

function formatPercent(used: number, total: number) {
  const value = total > 0 ? (used / total) * 100 : 0;
  if (value > 0 && value < 0.1) return "unter 0,1 %";
  return `${new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value)} %`;
}

function formatLoad(load: number) {
  const safe = Number.isFinite(load) && load > 0 ? load : 0;
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(safe);
}

function countLabel(count: number, one: string, many: string) {
  const safe = Number.isFinite(count) && count > 0 ? Math.round(count) : 0;
  return `${new Intl.NumberFormat("de-DE").format(safe)} ${safe === 1 ? one : many}`;
}
