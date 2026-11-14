"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseName } from "@/lib/game-input";

const fieldClass = "mt-2 w-full border border-line bg-cream px-3 py-2.5 text-ink";

export function GameProfile({ name }: { name: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(name ?? "");
  const [open, setOpen] = useState(name === null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseName(value);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/spiel/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: parsed.name }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Der Name konnte nicht gespeichert werden.");
        return;
      }
      setValue(parsed.name);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Die Verbindung hat nicht geklappt. Bitte noch einmal versuchen.");
    } finally {
      setPending(false);
    }
  }

  if (name && !open) {
    return (
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border border-line bg-paper px-4 py-4">
        <p>
          Du spielst als <span className="font-medium">{name}</span>.
        </p>
        <button type="button" onClick={() => setOpen(true)} className="text-sm text-wine hover:underline">
          Name ändern
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 border border-line bg-paper px-4 py-4">
      <label htmlFor="player-name" className="text-sm font-medium">
        Wie heißt du?
      </label>
      <input
        id="player-name"
        name="name"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoComplete="name"
        maxLength={40}
        required
        className={fieldClass}
      />
      {error ? (
        <p role="alert" className="mt-3 border border-wine/30 bg-wine/5 px-3 py-2 text-wine">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="bg-wine px-4 py-2.5 text-sm text-paper hover:bg-wine-deep disabled:opacity-60">
          {pending ? "Wird gespeichert…" : name ? "Namen speichern" : "Mitspielen"}
        </button>
        {name ? (
          <button
            type="button"
            onClick={() => {
              setValue(name);
              setError("");
              setOpen(false);
            }}
            className="px-4 py-2.5 text-sm text-wine hover:underline"
          >
            Abbrechen
          </button>
        ) : (
          <p className="self-center text-sm text-ink-soft">Die Punkte bleiben auf diesem Gerät.</p>
        )}
      </div>
    </form>
  );
}
