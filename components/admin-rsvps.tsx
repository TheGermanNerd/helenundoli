"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RsvpRow } from "@/lib/db";
import { eventLabel, managedGuests, mealLabel, type MealOption } from "@/lib/rsvp";

type AdminRow = RsvpRow & { received: string };

type Stats = {
  yes: number;
  no: number;
  people: number;
  ceremony: number;
};

type SaveBody =
  | { id: number; action: "guest" | "all"; index?: number; attending: boolean }
  | { id: number; action: "delete-guest"; index: number }
  | { id: number; action: "delete" };

function text(value: string | null) {
  return value && value.trim() ? value : "—";
}

function matchesQuery(row: AdminRow, query: string) {
  const needle = query.trim().toLocaleLowerCase("de");
  if (!needle) return true;
  const guests = managedGuests(row);
  return [row.name, row.email, ...guests.map((guest) => guest.name)]
    .join("\n")
    .toLocaleLowerCase("de")
    .includes(needle);
}

export function AdminRsvps({
  rows,
  stats,
  mealOptions,
}: {
  rows: AdminRow[];
  stats: Stats;
  mealOptions: MealOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  async function save(key: string, body: SaveBody) {
    setBusy(key);
    setError("");
    try {
      const response = await fetch("/api/admin/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Das hat nicht geklappt.");
        return;
      }
      router.refresh();
    } catch {
      setError("Die Verbindung hat nicht geklappt. Bitte versucht es noch einmal.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Zusagen", stats.yes],
          ["Absagen", stats.no],
          ["Personen", stats.people],
          ["Standesamt", stats.ceremony],
        ].map(([label, value]) => (
          <div key={label} className="border border-line bg-paper px-4 py-4">
            <dt className="text-xs font-medium uppercase tracking-[0.16em] text-olive">{label}</dt>
            <dd className="mt-2 font-serif text-4xl text-bronze">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-ink-soft">
        Absagen zählt einzelne Gäste, die abgesagt haben. Personen zählt, wer zur Party kommt.
        Standesamt zählt, wer zur Trauung und zur Party kommt.
      </p>
      {error ? (
        <p role="alert" className="mt-4 border border-wine/30 bg-wine/5 px-3 py-2 text-wine">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-10 font-serif text-2xl text-ink-soft">Noch keine Antworten.</p>
      ) : (
        <GuestTable
          rows={rows.filter((row) => matchesQuery(row, query))}
          query={query}
          onQuery={setQuery}
          busy={busy}
          save={save}
          mealOptions={mealOptions}
        />
      )}
    </div>
  );
}

function GuestTable({
  rows,
  query,
  onQuery,
  busy,
  save,
  mealOptions,
}: {
  rows: AdminRow[];
  query: string;
  onQuery: (value: string) => void;
  busy: string | null;
  save: (key: string, body: SaveBody) => void;
  mealOptions: MealOption[];
}) {
  const [openIds, setOpenIds] = useState<ReadonlySet<number>>(new Set());

  function toggleRow(id: number) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mt-8">
      <label htmlFor="guest-search" className="sr-only">
        Gäste suchen
      </label>
      <input
        id="guest-search"
        type="search"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder="Gäste suchen"
        autoComplete="off"
        className="w-52 rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft print:hidden"
      />
      {rows.length === 0 ? (
        <p className="mt-6 font-serif text-2xl text-ink-soft">Keine passenden Gäste.</p>
      ) : (
        <div className="mt-3 overflow-x-auto border border-line bg-paper print:mt-0">
          <table className="w-full min-w-[70rem] text-left text-sm">
            <caption className="sr-only">Eingegangene Antworten</caption>
            <thead className="border-b border-line text-xs uppercase tracking-[0.14em] text-olive">
              <tr>
                <th className="w-10 px-1 py-3">
                  <span className="sr-only">Aufklappen</span>
                </th>
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">E-Mail</th>
                <th className="px-3 py-3 font-medium">Teilnahme</th>
                <th className="px-3 py-3 font-medium">Personen</th>
                <th className="px-3 py-3 font-medium">Gäste</th>
                <th className="px-3 py-3 font-medium">Dabei</th>
                <th className="px-3 py-3 font-medium">Menü</th>
                <th className="px-3 py-3 font-medium">Nachricht</th>
                <th className="px-3 py-3 font-medium">Eingegangen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const guests = managedGuests(row);
                const coming = guests.filter((guest) => guest.attending).length;
                const declined = guests.length - coming;
                const expandable = guests.length > 1;
                const expanded = expandable && openIds.has(row.id);
                const collapsed = expandable && !expanded;
                return (
                  <tr key={row.id} className="border-b border-line align-top last:border-b-0">
                    <td className="px-1 py-2">
                      {expandable ? (
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-label={expanded ? `Gäste von ${row.name} einklappen` : `Gäste von ${row.name} aufklappen`}
                          onClick={() => toggleRow(row.id)}
                          className="grid size-7 place-items-center rounded-md text-olive hover:bg-linen hover:text-wine"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            aria-hidden="true"
                            className={`size-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M6 3.5 10.5 8 6 12.5" />
                          </svg>
                        </button>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">{row.name}</td>
                    <td className="px-3 py-3 break-all">{row.email || "—"}</td>
                    <td className="px-3 py-3">
                      <div>{coming > 0 ? "Zusage" : "Absage"}</div>
                      {declined > 0 && coming > 0 ? (
                        <p className="mt-1 text-xs text-ink-soft">{declined} abgesagt</p>
                      ) : null}
                      {expanded ? (
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() =>
                            save(`${row.id}:all`, { id: row.id, action: "all", attending: coming === 0 })
                          }
                          className="mt-2 block text-xs text-wine underline decoration-wine/40 underline-offset-2 hover:decoration-wine disabled:opacity-60 print:hidden"
                        >
                          {busy === `${row.id}:all` ? "Wird gespeichert…" : coming > 0 ? "Alle absagen" : "Alle zusagen"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => {
                          if (!window.confirm(`Die Antwort von ${row.name} wirklich löschen?`)) return;
                          save(`${row.id}:delete`, { id: row.id, action: "delete" });
                        }}
                        className="mt-2 block text-xs text-ink-soft underline decoration-ink-soft/40 underline-offset-2 hover:text-wine hover:decoration-wine disabled:opacity-60 print:hidden"
                      >
                        {busy === `${row.id}:delete` ? "Wird gelöscht…" : "Antwort löschen"}
                      </button>
                    </td>
                    <td className="px-3 py-3">{guests.length === 0 ? "—" : coming}</td>
                    <td className="px-3 py-3">
                      {guests.length === 0 ? (
                        "—"
                      ) : (
                        <>
                          {collapsed ? (
                            <p className="line-clamp-1 print:hidden">
                              <span className={guests[0].attending ? undefined : "text-ink-soft line-through"}>
                                {guests[0].name}
                              </span>
                            </p>
                          ) : null}
                          <ul className={collapsed ? "hidden print:block" : undefined}>
                            {guests.map((guest, index) => {
                              const key = `${row.id}:${index}`;
                              return (
                                <li key={key} className="flex h-9 items-center gap-2 border-b border-line/50 last:border-b-0">
                                  <span className={`min-w-0 truncate ${guest.attending ? "" : "text-ink-soft line-through"}`}>
                                    {guest.name}
                                  </span>
                                  {guest.attending ? null : (
                                    <span className="shrink-0 text-[0.65rem] font-medium tracking-[0.14em] text-olive uppercase">
                                      abgesagt
                                    </span>
                                  )}
                                  <span className="ml-auto flex shrink-0 items-center gap-2 print:hidden">
                                    <button
                                      type="button"
                                      disabled={busy !== null}
                                      aria-label={guest.attending ? `${guest.name} absagen` : `${guest.name} wieder zusagen`}
                                      onClick={() =>
                                        save(key, {
                                          id: row.id,
                                          action: "guest",
                                          index,
                                          attending: !guest.attending,
                                        })
                                      }
                                      className="rounded-lg border border-wine px-2 py-1 text-xs text-wine hover:bg-wine hover:text-paper disabled:opacity-60"
                                    >
                                      {busy === key ? "…" : guest.attending ? "Absagen" : "Zusage"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy !== null}
                                      aria-label={`${guest.name} löschen`}
                                      onClick={() => {
                                        const last = guests.length === 1;
                                        const question = last
                                          ? `${guest.name} wirklich löschen? Die Antwort wird damit entfernt.`
                                          : `${guest.name} wirklich aus der Antwort löschen?`;
                                        if (!window.confirm(question)) return;
                                        save(`${row.id}:delete:${index}`, {
                                          id: row.id,
                                          action: "delete-guest",
                                          index,
                                        });
                                      }}
                                      className="text-xs text-ink-soft underline decoration-ink-soft/40 underline-offset-2 hover:text-wine hover:decoration-wine disabled:opacity-60"
                                    >
                                      {busy === `${row.id}:delete:${index}` ? "…" : "Löschen"}
                                    </button>
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {guests.length === 0 ? (
                        "—"
                      ) : (
                        <>
                          {collapsed ? (
                            <p className="line-clamp-1 print:hidden">
                              <span className={guests[0].attending ? undefined : "text-ink-soft line-through"}>
                                {eventLabel(guests[0].event)}
                              </span>
                            </p>
                          ) : null}
                          <ul className={collapsed ? "hidden print:block" : undefined}>
                            {guests.map((guest, index) => (
                              <li
                                key={`${row.id}:event:${index}`}
                                className={`flex h-9 items-center border-b border-line/50 last:border-b-0 ${guest.attending ? "" : "text-ink-soft line-through"}`}
                              >
                                {eventLabel(guest.event)}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {guests.length === 0 ? (
                        "—"
                      ) : (
                        <>
                          {collapsed ? (
                            <p className="line-clamp-1 print:hidden">
                              <span className={guests[0].attending ? undefined : "text-ink-soft line-through"}>
                                {mealLabel(guests[0].meal, mealOptions)}
                              </span>
                            </p>
                          ) : null}
                          <ul className={collapsed ? "hidden print:block" : undefined}>
                            {guests.map((guest, index) => (
                              <li
                                key={`${row.id}:meal:${index}`}
                                className={`flex h-9 items-center border-b border-line/50 last:border-b-0 ${guest.attending ? "" : "text-ink-soft line-through"}`}
                              >
                                {mealLabel(guest.meal, mealOptions)}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </td>
                    <td className="max-w-xs px-3 py-3 whitespace-pre-wrap">{text(row.message)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{row.received}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
