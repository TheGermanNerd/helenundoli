"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { parseName, pointsLabel } from "@/lib/game-input";

const fieldClass = "mt-2 w-full border border-line bg-cream px-3 py-2.5 text-ink";

export function ClaimForm({ token, playerName }: { token: string; playerName: string | null }) {
  const lock = useRef(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<{ status: "ok" | "already"; points: number; score: number } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;

    let payload: { token: string; name?: string } = { token };
    if (!playerName) {
      const parsed = parseName(name);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      payload = { token, name: parsed.name };
    }

    lock.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/spiel/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        status?: "ok" | "already";
        points?: number;
        score?: number;
      } | null;
      if (!response.ok || (data?.status !== "ok" && data?.status !== "already") || data.points === undefined || data.score === undefined) {
        lock.current = false;
        setError(data?.error ?? "Die Punkte konnten nicht gespeichert werden.");
        return;
      }
      setDone({ status: data.status, points: data.points, score: data.score });
    } catch {
      lock.current = false;
      setError("Die Verbindung hat nicht geklappt. Bitte noch einmal versuchen.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 text-center">
        <p className="font-serif text-3xl text-bronze" role="status">
          {done.status === "already" ? "Die Aufgabe hast du schon." : "Geschafft."}
        </p>
        <p className="mt-3 text-ink-soft">
          {done.status === "already"
            ? "Sie zählt nur einmal."
            : `Das sind ${pointsLabel(done.points)}. Du hast jetzt ${pointsLabel(done.score)}.`}
        </p>
        <Link href="/spiel" className="mt-6 inline-block bg-wine px-4 py-3 text-paper hover:bg-wine-deep">
          Zum Spiel
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6">
      {playerName ? <p className="text-ink-soft">Du spielst als {playerName}.</p> : null}
      {playerName ? null : (
        <div className="mt-4">
          <label htmlFor="claim-name" className="text-sm font-medium">
            Wie heißt du?
          </label>
          <input
            id="claim-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            maxLength={40}
            required
            className={fieldClass}
          />
        </div>
      )}
      {error ? (
        <p role="alert" className="mt-4 border border-wine/30 bg-wine/5 px-3 py-2 text-wine">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full bg-wine px-4 py-3 text-paper hover:bg-wine-deep disabled:opacity-60"
      >
        {pending ? "Wird gespeichert…" : "Punkte holen"}
      </button>
    </form>
  );
}
