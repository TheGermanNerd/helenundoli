"use client";

import { useState } from "react";
import { MEALS, parseRsvp } from "@/lib/rsvp";

const fieldClass =
  "mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-ink shadow-[0_1px_2px_rgba(74,48,28,0.04)] transition-[border-color,box-shadow] duration-200 focus-visible:border-wine/50";

type ExtraGuest = {
  firstName: string;
  lastName: string;
  meal: string;
};

function emptyGuest(): ExtraGuest {
  return { firstName: "", lastName: "", meal: "" };
}

function partySize(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const count = Number(value);
  if (count < 1 || count > 20) return null;
  return count;
}

function MealField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select id={id} name={id} value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
      <option value="">Bitte wählen</option>
      {MEALS.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

export function RsvpForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [attending, setAttending] = useState<boolean | null>(null);
  const [guestCount, setGuestCount] = useState("1");
  const [meal, setMeal] = useState("");
  const [companions, setCompanions] = useState<ExtraGuest[]>([]);
  const [message, setMessage] = useState("");
  const [fax, setFax] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<"yes" | "no" | null>(null);
  const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

  if (done) {
    return (
      <p className="text-center font-serif text-3xl leading-snug text-bronze" role="status">
        {done === "yes"
          ? `Danke, ${displayName}. Wir haben eure Zusage erhalten und freuen uns auf euch.`
          : `Danke, ${displayName}. Schade, dass es diesmal nicht klappt. Wir denken an euch.`}
      </p>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const count = partySize(guestCount);
    const guests =
      attending && count
        ? [
            { firstName, lastName, meal },
            ...Array.from({ length: count - 1 }, (_, index) => companions[index] ?? emptyGuest()),
          ]
        : [];

    const payload = {
      firstName,
      lastName,
      email,
      attending,
      guestCount: attending ? Number(guestCount) : 0,
      guests,
      message,
      fax,
    };
    const parsed = parseRsvp(payload);
    if (parsed.status === "error") {
      setError(parsed.error);
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Die Antwort konnte nicht gespeichert werden. Bitte versucht es noch einmal.");
        return;
      }
      setDone(attending ? "yes" : "no");
    } catch {
      setError("Die Verbindung hat nicht geklappt. Bitte versucht es noch einmal.");
    } finally {
      setPending(false);
    }
  }

  const count = partySize(guestCount);
  const several = count !== null && count > 1;

  function onGuestCountChange(value: string) {
    setGuestCount(value);
    const next = partySize(value);
    if (next === null || next < 2) return;
    setCompanions((current) => {
      if (current.length >= next - 1) return current;
      return [...current, ...Array.from({ length: next - 1 - current.length }, emptyGuest)];
    });
  }

  function updateCompanion(index: number, patch: Partial<ExtraGuest>) {
    setCompanions((current) => current.map((guest, guestIndex) => (guestIndex === index ? { ...guest, ...patch } : guest)));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <p className="text-sm text-ink-soft">Pflichtfelder sind mit * markiert.</p>
      {error ? (
        <p role="alert" className="rounded-xl border border-wine/30 bg-wine/5 px-4 py-3 text-wine">
          {error}
        </p>
      ) : null}

      <div className="sr-only" aria-hidden="true">
        <label htmlFor="fax">Fax</label>
        <input
          id="fax"
          name="fax"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={fax}
          onChange={(event) => setFax(event.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="first-name" className="text-sm font-medium">
            Vorname *
          </label>
          <input
            id="first-name"
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="last-name" className="text-sm font-medium">
            Nachname
          </label>
          <input
            id="last-name"
            name="lastName"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-medium">
          E-Mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={fieldClass}
        />
        <p className="mt-1 text-sm text-ink-soft">Freiwillig.</p>
      </div>

      <fieldset>
        <legend className="font-serif text-2xl text-bronze">Kommt ihr? *</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={`choice flex cursor-pointer items-center justify-center rounded-xl border px-4 py-3.5 text-center transition duration-200 ${attending === true ? "border-wine bg-wine text-paper shadow-[0_10px_24px_-16px_rgba(122,46,42,0.85)]" : "border-line bg-cream text-ink hover:border-wine/35 hover:bg-white"}`}>
            <input
              className="sr-only"
              type="radio"
              name="attending"
              checked={attending === true}
              onChange={() => setAttending(true)}
            />
            Ja, ich komme
          </label>
          <label className={`choice flex cursor-pointer items-center justify-center rounded-xl border px-4 py-3.5 text-center transition duration-200 ${attending === false ? "border-wine bg-wine text-paper shadow-[0_10px_24px_-16px_rgba(122,46,42,0.85)]" : "border-line bg-cream text-ink hover:border-wine/35 hover:bg-white"}`}>
            <input
              className="sr-only"
              type="radio"
              name="attending"
              checked={attending === false}
              onChange={() => setAttending(false)}
            />
            Leider nicht
          </label>
        </div>
      </fieldset>

      {attending === true ? (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="guest-count" className="text-sm font-medium">
                Anzahl Personen *
              </label>
              <input
                id="guest-count"
                name="guestCount"
                type="number"
                min={1}
                max={20}
                inputMode="numeric"
                value={guestCount}
                onChange={(event) => onGuestCountChange(event.target.value)}
                className={fieldClass}
              />
              <p className="mt-1 text-sm text-ink-soft">Euch eingeschlossen.</p>
            </div>
            <div>
              <label htmlFor="meal" className="text-sm font-medium">
                {several ? "Menüwunsch Gast 1 *" : "Menüwunsch *"}
              </label>
              <MealField id="meal" value={meal} onChange={setMeal} />
              {several ? (
                <p className="mt-1 text-sm text-ink-soft">{displayName ? `Für ${displayName}.` : "Für den Vornamen oben."}</p>
              ) : null}
            </div>
          </div>
          {several && count ? (
            <div className="space-y-4">
              <p className="text-sm text-ink-soft">
                Für jede weitere Person sind Vorname und Menüwunsch Pflicht. Der Nachname ist freiwillig.
              </p>
              {Array.from({ length: count - 1 }, (_, index) => {
                const guest = companions[index] ?? emptyGuest();
                const number = index + 2;
                return (
                  <fieldset key={number} className="rounded-xl border border-line px-4 py-4 sm:px-5">
                    <legend className="px-2 font-serif text-xl text-bronze">Gast {number}</legend>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`guest-${number}-first`} className="text-sm font-medium">
                          Vorname *
                        </label>
                        <input
                          id={`guest-${number}-first`}
                          name={`guest-${number}-first`}
                          autoComplete="off"
                          value={guest.firstName}
                          onChange={(event) => updateCompanion(index, { firstName: event.target.value })}
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label htmlFor={`guest-${number}-last`} className="text-sm font-medium">
                          Nachname
                        </label>
                        <input
                          id={`guest-${number}-last`}
                          name={`guest-${number}-last`}
                          autoComplete="off"
                          value={guest.lastName}
                          onChange={(event) => updateCompanion(index, { lastName: event.target.value })}
                          className={fieldClass}
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label htmlFor={`guest-${number}-meal`} className="text-sm font-medium">
                        Menüwunsch *
                      </label>
                      <MealField
                        id={`guest-${number}-meal`}
                        value={guest.meal}
                        onChange={(value) => updateCompanion(index, { meal: value })}
                      />
                    </div>
                  </fieldset>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <label htmlFor="message" className="text-sm font-medium">
          Nachricht
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={fieldClass}
        />
        <p className="mt-1 text-sm text-ink-soft">Allergien, Liedwünsche oder ein Gruß.</p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-wine px-6 py-3.5 text-paper shadow-[0_12px_28px_-16px_rgba(122,46,42,0.9)] transition duration-200 hover:bg-wine-deep disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Wird gesendet…" : "Antwort senden"}
      </button>
    </form>
  );
}
