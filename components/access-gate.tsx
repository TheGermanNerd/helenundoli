"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stationery } from "@/components/ornaments";

export function AccessGate() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Der Code konnte nicht geprüft werden.");
        return;
      }
      router.refresh();
    } catch {
      setError("Die Verbindung hat nicht geklappt. Bitte versucht es noch einmal.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center px-4 py-10 sm:px-6">
      <Stationery florals className="mx-auto w-full max-w-lg">
        <div className="px-6 pt-36 pb-40 text-center sm:px-14 sm:pt-32 sm:pb-36">
          <p className="font-script text-6xl leading-none text-bronze sm:text-7xl">
            <span className="block">Helen</span>
            <span className="my-1 block font-serif text-[0.68rem] tracking-[0.42em] text-ink">UND</span>
            <span className="block">Oliver</span>
          </p>
          <h1 className="mt-6 font-serif text-4xl text-bronze">Schön, dass ihr da seid.</h1>
          <p className="mx-auto mt-4 max-w-sm leading-relaxed text-ink-soft">
            Die Einladung ist für die Menschen, die wir eingeladen haben. Gebt bitte den Zugangscode ein, den ihr von
            uns bekommen habt.
          </p>
          <form onSubmit={onSubmit} className="mx-auto mt-8 max-w-xs text-left">
            {error ? (
              <p role="alert" className="mb-4 border border-wine/30 bg-wine/5 px-3 py-2 text-wine">
                {error}
              </p>
            ) : null}
            <label htmlFor="access-code" className="block text-sm font-medium">
              Zugangscode
            </label>
            <input
              id="access-code"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-2 w-full rounded-xl border border-line bg-cream px-3 py-2.5"
            />
            <button
              type="submit"
              disabled={pending}
              className="mt-6 w-full rounded-xl bg-wine px-5 py-3 text-paper hover:bg-wine-deep disabled:opacity-60"
            >
              {pending ? "Wird geprüft…" : "Einladung öffnen"}
            </button>
          </form>
        </div>
      </Stationery>
    </div>
  );
}
