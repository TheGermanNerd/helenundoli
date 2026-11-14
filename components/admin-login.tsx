"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Die Anmeldung hat nicht geklappt.");
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
    <form onSubmit={onSubmit} className="mx-auto max-w-md border border-line bg-paper px-6 py-8">
      <h1 className="font-serif text-4xl text-bronze">Antworten</h1>
      <p className="mt-3 text-ink-soft">Diese Seite ist nur für Helen und Oliver.</p>
      {error ? (
        <p role="alert" className="mt-4 border border-wine/30 bg-wine/5 px-3 py-2 text-wine">
          {error}
        </p>
      ) : null}
      <label htmlFor="password" className="mt-6 block text-sm font-medium">
        Passwort
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="mt-2 w-full border border-line bg-cream px-3 py-2.5"
      />
      <button
        type="submit"
        disabled={pending}
        className="mt-6 bg-wine px-5 py-3 text-paper hover:bg-wine-deep disabled:opacity-60"
      >
        {pending ? "Wird geprüft…" : "Anmelden"}
      </button>
    </form>
  );
}
