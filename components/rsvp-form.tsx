"use client";

import { useState } from "react";
import { wedding } from "@/lib/content";
import { parseRsvp, type EventChoice, type MealOption, type RsvpFieldRules } from "@/lib/rsvp";

const fieldClass =
  "mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-ink shadow-[0_1px_2px_rgba(74,48,28,0.04)] transition-[border-color,box-shadow] duration-200 focus-visible:border-wine/50";

type ExtraGuest = {
  firstName: string;
  lastName: string;
  meal: string;
  event: "" | EventChoice;
};

function emptyGuest(): ExtraGuest {
  return { firstName: "", lastName: "", meal: "", event: "" };
}

function partySize(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const count = Number(value);
  if (count < 1 || count > 20) return null;
  return count;
}

function marked(label: string, required: boolean) {
  return required ? `${label} *` : label;
}

function listDe(items: string[]) {
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`;
}

function extraGuestNote(fields: RsvpFieldRules) {
  const requiredNames = [fields.firstNameRequired ? "Vorname" : "", fields.lastNameRequired ? "Nachname" : ""].filter(
    Boolean,
  );
  const optionalNames = [fields.firstNameRequired ? "" : "Vorname", fields.lastNameRequired ? "" : "Nachname"].filter(
    Boolean,
  );
  const required = [...requiredNames, "Menüwunsch"];
  const duty =
    required.length === 1
      ? "Für jede weitere Person ist der Menüwunsch Pflicht."
      : `Für jede weitere Person sind ${listDe(required)} Pflicht.`;
  if (optionalNames.length === 0) return duty;
  if (optionalNames.length === 1) return `${duty} Der ${optionalNames[0]} ist freiwillig.`;
  return `${duty} ${listDe(optionalNames)} sind freiwillig.`;
}

function MealField({
  id,
  value,
  meals,
  onChange,
}: {
  id: string;
  value: string;
  meals: readonly MealOption[];
  onChange: (value: string) => void;
}) {
  return (
    <select id={id} name={id} value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
      <option value="">Bitte wählen</option>
      {meals.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

const eventOptions = [
  ["both", "Standesamt und Party"],
  ["party", "Nur Party"],
] as const;

function EventField({
  name,
  legend,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  value: string;
  onChange: (value: EventChoice) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {eventOptions.map(([option, label]) => (
          <label
            key={option}
            className={`choice flex cursor-pointer items-center justify-center rounded-xl border px-4 py-3.5 text-center transition duration-200 ${value === option ? "border-wine bg-wine text-paper shadow-[0_10px_24px_-16px_rgba(122,46,42,0.85)]" : "border-line bg-cream text-ink hover:border-wine/35 hover:bg-white"}`}
          >
            <input
              className="sr-only"
              type="radio"
              name={name}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function RsvpForm({ meals, fields }: { meals: readonly MealOption[]; fields: RsvpFieldRules }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [attending, setAttending] = useState<boolean | null>(null);
  const [guestCount, setGuestCount] = useState("1");
  const [meal, setMeal] = useState("");
  const [eventChoice, setEventChoice] = useState<"" | EventChoice>("");
  const [companions, setCompanions] = useState<ExtraGuest[]>([]);
  const [message, setMessage] = useState("");
  const [fax, setFax] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<"yes" | "no" | null>(null);
  const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

  if (done) {
    const greeting = displayName ? `Danke, ${displayName}.` : "Danke.";
    return (
      <p className="text-center font-serif text-3xl leading-snug text-bronze" role="status">
        {done === "yes"
          ? `${greeting} Wir haben eure Zusage erhalten und freuen uns auf euch.`
          : `${greeting} Schade, dass es diesmal nicht klappt. Wir denken an euch.`}
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
            { firstName, lastName, meal, event: eventChoice },
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
    const parsed = parseRsvp(payload, meals, fields);
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
    <div>
      <div className="text-center">
        <p className="font-serif text-[0.68rem] font-medium tracking-[0.28em] text-olive uppercase">Rückmeldung</p>
        <h2 className="mt-3 font-serif text-4xl text-bronze sm:text-5xl">Sagt uns Bescheid</h2>
        <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
          Bitte sagt uns bis zum {wedding.replyBy} Bescheid, ob ihr dabei seid.
        </p>
      </div>
      <form onSubmit={onSubmit} noValidate className="mt-10 space-y-6">
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
            {marked("Vorname", fields.firstNameRequired)}
          </label>
          <input
            id="first-name"
            name="firstName"
            autoComplete="given-name"
            required={fields.firstNameRequired}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="last-name" className="text-sm font-medium">
            {marked("Nachname", fields.lastNameRequired)}
          </label>
          <input
            id="last-name"
            name="lastName"
            autoComplete="family-name"
            required={fields.lastNameRequired}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-medium">
          {marked("E-Mail", fields.emailRequired)}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required={fields.emailRequired}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={fieldClass}
        />
        {fields.emailRequired ? null : (
          <p className="mt-1 text-sm text-ink-soft">
            Freiwillig. Wenn ihr eine E-Mail angebt, schicken wir euch eine Bestätigungsmail.
          </p>
        )}
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
              <MealField id="meal" value={meal} meals={meals} onChange={setMeal} />
              {several ? (
                <p className="mt-1 text-sm text-ink-soft">{displayName ? `Für ${displayName}.` : "Für den Namen oben."}</p>
              ) : null}
            </div>
          </div>
          <EventField
            name="event"
            legend={several ? "Wo ist Gast 1 dabei? *" : "Wo bist du dabei? *"}
            value={eventChoice}
            onChange={setEventChoice}
          />
          {several && count ? (
            <div className="space-y-4">
              <p className="text-sm text-ink-soft">{extraGuestNote(fields)}</p>
              {Array.from({ length: count - 1 }, (_, index) => {
                const guest = companions[index] ?? emptyGuest();
                const number = index + 2;
                return (
                  <fieldset key={number} className="rounded-xl border border-line px-4 py-4 sm:px-5">
                    <legend className="px-2 font-serif text-xl text-bronze">Gast {number}</legend>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`guest-${number}-first`} className="text-sm font-medium">
                          {marked("Vorname", fields.firstNameRequired)}
                        </label>
                        <input
                          id={`guest-${number}-first`}
                          name={`guest-${number}-first`}
                          autoComplete="off"
                          required={fields.firstNameRequired}
                          value={guest.firstName}
                          onChange={(event) => updateCompanion(index, { firstName: event.target.value })}
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label htmlFor={`guest-${number}-last`} className="text-sm font-medium">
                          {marked("Nachname", fields.lastNameRequired)}
                        </label>
                        <input
                          id={`guest-${number}-last`}
                          name={`guest-${number}-last`}
                          autoComplete="off"
                          required={fields.lastNameRequired}
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
                        meals={meals}
                        onChange={(value) => updateCompanion(index, { meal: value })}
                      />
                    </div>
                    <div className="mt-4">
                      <EventField
                        name={`guest-${number}-event`}
                        legend={`Wo ist Gast ${number} dabei? *`}
                        value={guest.event}
                        onChange={(value) => updateCompanion(index, { event: value })}
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
        <p className="mt-1 text-sm text-ink-soft">Allergien, Anreise oder ein Gruß.</p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-wine px-6 py-3.5 text-paper shadow-[0_12px_28px_-16px_rgba(122,46,42,0.9)] transition duration-200 hover:bg-wine-deep disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Wird gesendet…" : "Antwort senden"}
      </button>
      </form>
    </div>
  );
}
