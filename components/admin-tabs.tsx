"use client";

import { useState } from "react";
import { LogoutButton } from "@/components/logout-button";

export function AdminTabs({
  pending,
  rsvp,
  photos,
  game,
}: {
  pending: number;
  rsvp: React.ReactNode;
  photos: React.ReactNode;
  game: React.ReactNode;
}) {
  const [tab, setTab] = useState<"rsvp" | "photos" | "game">("rsvp");
  const photosLabel = pending > 0 ? `Bilder (${pending})` : "Bilder";
  const title = tab === "rsvp" ? "Antworten" : tab === "photos" ? "Bilder" : "Spiel";
  const description =
    tab === "rsvp"
      ? "Mehrere Antworten derselben Person bleiben alle stehen."
      : tab === "photos"
        ? "Freigegebene Bilder erscheinen auf der Bilder-Seite."
        : "Bis zu fünf Aufgaben. Punkte gibt es nur über den QR-Code der Aufgabe.";

  return (
    <div>
      <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl text-bronze sm:text-5xl">{title}</h1>
          <p className="mt-2 text-ink-soft">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {tab === "rsvp" ? (
            <a href="/api/admin/export" className="border border-wine px-4 py-2 text-sm text-wine hover:bg-wine hover:text-paper">
              Als CSV speichern
            </a>
          ) : null}
          <LogoutButton />
        </div>
      </div>

      <div className="mt-6 flex gap-2 print:hidden" role="tablist" aria-label="Bereiche">
        {(
          [
            ["rsvp", "Antworten"],
            ["photos", photosLabel],
            ["game", "Spiel"],
          ] as const
        ).map(([value, label]) => {
          const selected = tab === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(value)}
              className={`border px-4 py-2 text-sm ${
                selected ? "border-wine bg-wine text-paper" : "border-line bg-paper text-ink hover:border-wine"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-8">{tab === "rsvp" ? rsvp : tab === "photos" ? photos : game}</div>
    </div>
  );
}
