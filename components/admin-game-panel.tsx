"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseSettings, parseTaskFields, pointsLabel, TASK_LIMIT } from "@/lib/game-input";
import { formatTimestamp } from "@/lib/format";

const fieldClass = "mt-2 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink";

type Settings = {
  prizeTitle: string;
  prizeText: string;
  goalPoints: number;
  enabled: boolean;
};

type TaskCard = {
  id: number;
  title: string;
  instruction: string;
  points: number;
  claimUrl: string;
  svg: string;
};

type PlayerRow = {
  id: number;
  name: string;
  points: number;
  createdAt: string;
};

export function AdminGamePanel({
  settings,
  tasks,
  players,
}: {
  settings: Settings;
  tasks: TaskCard[];
  players: PlayerRow[];
}) {
  const localQr = tasks.some((task) => /:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(task.claimUrl));

  return (
    <div className="space-y-10">
      <SettingsForm settings={settings} />
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
          <h2 className="font-serif text-3xl text-bronze">Aufgaben</h2>
          {tasks.length > 0 ? (
            <button type="button" onClick={() => window.print()} className="rounded-xl border border-wine px-4 py-2 text-sm text-wine hover:bg-wine hover:text-paper">
              QR-Codes drucken
            </button>
          ) : null}
        </div>
        <p className="mt-2 hidden text-center font-script text-4xl text-bronze print:block">Helen & Oliver</p>
        {localQr ? (
          <p className="mt-3 border border-gold bg-cream px-3 py-2 text-sm print:hidden">
            Diese Codes gelten nur für diesen Rechner. Zum Ausdrucken die Verwaltung auf der öffentlichen Adresse öffnen.
          </p>
        ) : null}
        {tasks.length === 0 ? (
          <p className="mt-4 font-serif text-2xl text-ink-soft">Noch keine Aufgaben.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {tasks.map((task, index) => (
              <TaskEditor key={task.id} task={task} index={index} total={tasks.length} />
            ))}
          </ul>
        )}
        {tasks.length < TASK_LIMIT ? <NewTaskForm /> : <p className="mt-4 text-sm text-ink-soft print:hidden">Fünf Aufgaben sind das Maximum.</p>}
      </section>
      <PlayerList players={players} />
    </div>
  );
}

function SettingsForm({ settings }: { settings: Settings }) {
  const { post, pending, error } = useGamePost();
  const [prizeTitle, setPrizeTitle] = useState(settings.prizeTitle);
  const [prizeText, setPrizeText] = useState(settings.prizeText);
  const [goalPoints, setGoalPoints] = useState(String(settings.goalPoints));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseSettings({ prizeTitle, prizeText, goalPoints });
    if (!parsed.ok) {
      post(null, parsed.error);
      return;
    }
    const saved = await post({
      action: "saveSettings",
      prizeTitle: parsed.prizeTitle,
      prizeText: parsed.prizeText,
      goalPoints: parsed.goalPoints,
    });
    if (saved) {
      setPrizeTitle(parsed.prizeTitle);
      setPrizeText(parsed.prizeText);
      setGoalPoints(String(parsed.goalPoints));
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="border border-line bg-paper px-4 py-4 print:hidden">
      <h2 className="font-serif text-3xl text-bronze">Preis</h2>
      <p className="mt-2 text-sm text-ink-soft">Der Preis erscheint, sobald jemand so viele Punkte hat.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div>
          <label htmlFor="prize-title" className="text-sm font-medium">
            Name des Preises
          </label>
          <input id="prize-title" value={prizeTitle} onChange={(event) => setPrizeTitle(event.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="goal-points" className="text-sm font-medium">
            Ziel
          </label>
          <input
            id="goal-points"
            inputMode="numeric"
            value={goalPoints}
            onChange={(event) => setGoalPoints(event.target.value)}
            className={fieldClass}
          />
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor="prize-text" className="text-sm font-medium">
          Text
        </label>
        <textarea id="prize-text" rows={3} value={prizeText} onChange={(event) => setPrizeText(event.target.value)} className={fieldClass} />
      </div>
      {error ? <ErrorNote message={error} /> : null}
      <button type="submit" disabled={pending} className="mt-4 rounded-xl bg-wine px-4 py-2 text-sm text-paper hover:bg-wine-deep disabled:opacity-60">
        {pending ? "Wird gespeichert…" : "Preis speichern"}
      </button>
    </form>
  );
}

function TaskEditor({ task, index, total }: { task: TaskCard; index: number; total: number }) {
  const { post, pending, error } = useGamePost();
  const [title, setTitle] = useState(task.title);
  const [instruction, setInstruction] = useState(task.instruction);
  const [points, setPoints] = useState(String(task.points));

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseTaskFields({ title, instruction, points });
    if (!parsed.ok) {
      post(null, parsed.error);
      return;
    }
    const saved = await post({
      action: "updateTask",
      id: task.id,
      title: parsed.title,
      instruction: parsed.instruction,
      points: parsed.points,
    });
    if (saved) {
      setTitle(parsed.title);
      setInstruction(parsed.instruction);
      setPoints(String(parsed.points));
    }
  }

  return (
    <li className="border border-line bg-paper p-4 print:break-inside-avoid print:border-0">
      <form onSubmit={save} noValidate className="print:hidden">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-olive">Aufgabe {index + 1}</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_8rem]">
          <div>
            <label htmlFor={`title-${task.id}`} className="text-sm font-medium">
              Titel
            </label>
            <input id={`title-${task.id}`} value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor={`points-${task.id}`} className="text-sm font-medium">
              Punkte
            </label>
            <input
              id={`points-${task.id}`}
              inputMode="numeric"
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              className={fieldClass}
            />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor={`instruction-${task.id}`} className="text-sm font-medium">
            Was ist zu tun?
          </label>
          <textarea
            id={`instruction-${task.id}`}
            rows={3}
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            className={fieldClass}
          />
        </div>
        {error ? <ErrorNote message={error} /> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className="rounded-xl bg-wine px-3 py-2 text-sm text-paper hover:bg-wine-deep disabled:opacity-60">
            {pending ? "Wird gespeichert…" : "Speichern"}
          </button>
          <button
            type="button"
            disabled={pending || index === 0}
            onClick={() => post({ action: "moveTask", id: task.id, direction: "up" })}
            className="rounded-xl border border-line px-3 py-2 text-sm hover:border-wine disabled:opacity-40"
          >
            Nach oben
          </button>
          <button
            type="button"
            disabled={pending || index === total - 1}
            onClick={() => post({ action: "moveTask", id: task.id, direction: "down" })}
            className="rounded-xl border border-line px-3 py-2 text-sm hover:border-wine disabled:opacity-40"
          >
            Nach unten
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Diese Aufgabe wirklich löschen? Die Punkte dafür fallen bei allen weg.")) return;
              void post({ action: "deleteTask", id: task.id });
            }}
            className="px-3 py-2 text-sm text-wine hover:underline disabled:opacity-60"
          >
            Löschen
          </button>
        </div>
      </form>
      <div className="mt-5 flex flex-col items-start gap-3 border-t border-line pt-4 sm:flex-row sm:items-center print:mt-0 print:border-0 print:pt-0">
        <div
          role="img"
          aria-label={`QR-Code für ${task.title}`}
          className="w-44 bg-cream p-2 [print-color-adjust:exact] [&_svg]:h-auto [&_svg]:w-full"
          style={{ printColorAdjust: "exact" }}
          dangerouslySetInnerHTML={{ __html: task.svg }}
        />
        <div>
          <p className="font-serif text-2xl text-bronze">{task.title}</p>
          <p className="mt-1 text-sm text-olive">{pointsLabel(task.points)}</p>
          <p className="mt-2 max-w-md text-xs break-all text-ink-soft print:hidden">{task.claimUrl}</p>
          <a href={task.claimUrl} className="mt-2 inline-block text-sm text-wine hover:underline print:hidden">
            Aufgabe öffnen
          </a>
        </div>
      </div>
    </li>
  );
}

function NewTaskForm() {
  const { post, pending, error } = useGamePost();
  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const [points, setPoints] = useState("10");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseTaskFields({ title, instruction, points });
    if (!parsed.ok) {
      post(null, parsed.error);
      return;
    }
    const saved = await post({
      action: "createTask",
      title: parsed.title,
      instruction: parsed.instruction,
      points: parsed.points,
    });
    if (saved) {
      setTitle("");
      setInstruction("");
      setPoints("10");
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 border border-dashed border-line bg-paper px-4 py-4 print:hidden">
      <h3 className="font-serif text-2xl text-bronze">Neue Aufgabe</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div>
          <label htmlFor="new-title" className="text-sm font-medium">
            Titel
          </label>
          <input id="new-title" value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="new-points" className="text-sm font-medium">
            Punkte
          </label>
          <input id="new-points" inputMode="numeric" value={points} onChange={(event) => setPoints(event.target.value)} className={fieldClass} />
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor="new-instruction" className="text-sm font-medium">
          Was ist zu tun?
        </label>
        <textarea
          id="new-instruction"
          rows={3}
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          className={fieldClass}
        />
      </div>
      {error ? <ErrorNote message={error} /> : null}
      <button type="submit" disabled={pending} className="mt-4 rounded-xl bg-wine px-4 py-2 text-sm text-paper hover:bg-wine-deep disabled:opacity-60">
        {pending ? "Wird gespeichert…" : "Aufgabe anlegen"}
      </button>
    </form>
  );
}

function PlayerList({ players }: { players: PlayerRow[] }) {
  const { post, pending, error } = useGamePost();

  return (
    <section className="print:hidden">
      <h2 className="font-serif text-3xl text-bronze">Spieler</h2>
      {error ? <ErrorNote message={error} /> : null}
      {players.length === 0 ? (
        <p className="mt-4 font-serif text-2xl text-ink-soft">Noch niemand spielt.</p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-line bg-paper">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <caption className="sr-only">Spieler und Punkte</caption>
            <thead className="border-b border-line text-xs uppercase tracking-[0.14em] text-olive">
              <tr>
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Punkte</th>
                <th className="px-3 py-3 font-medium">Dabei seit</th>
                <th className="px-3 py-3 font-medium">
                  <span className="sr-only">Aktion</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id} className="border-b border-line last:border-b-0">
                  <td className="px-3 py-3">{player.name}</td>
                  <td className="px-3 py-3">{player.points}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatTimestamp(player.createdAt)}</td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (!window.confirm("Diesen Spieler wirklich entfernen?")) return;
                        void post({ action: "deletePlayer", id: player.id });
                      }}
                      className="text-sm text-wine hover:underline disabled:opacity-60"
                    >
                      Entfernen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-3 border border-wine/30 bg-wine/5 px-3 py-2 text-wine">
      {message}
    </p>
  );
}

function useGamePost() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function post(body: Record<string, unknown> | null, localError?: string) {
    if (localError) {
      setError(localError);
      return false;
    }
    if (!body) return false;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Das hat nicht geklappt.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Die Verbindung hat nicht geklappt. Bitte versucht es noch einmal.");
      return false;
    } finally {
      setPending(false);
    }
  }

  return { post, pending, error };
}
