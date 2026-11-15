"use client";

import { useEffect, useState } from "react";
import { adminTab, type AdminTab } from "@/lib/admin-tab";
import { LogoutButton } from "@/components/logout-button";

export function AdminTabs({
  initialTab,
  pending,
  rsvp,
  photos,
  game,
  settings,
  server,
}: {
  initialTab: AdminTab;
  pending: number;
  rsvp: React.ReactNode;
  photos: React.ReactNode;
  game: React.ReactNode;
  settings: React.ReactNode;
  server: React.ReactNode;
}) {
  const [tab, setTab] = useState<AdminTab>(initialTab);

  useEffect(() => {
    function onPopState() {
      const value = new URLSearchParams(window.location.search).get("bereich") ?? undefined;
      setTab(adminTab(value));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function select(next: AdminTab) {
    setTab(next);
    const query = next === "rsvp" ? "/admin" : `/admin?bereich=${next}`;
    window.history.replaceState(null, "", query);
  }
  const photosLabel = pending > 0 ? `Bilder (${pending})` : "Bilder";
  const title =
    tab === "rsvp"
      ? "Antworten"
      : tab === "photos"
        ? "Bilder"
        : tab === "game"
          ? "Spiel"
          : tab === "settings"
            ? "Einstellungen"
            : "Server";
  const description =
    tab === "rsvp"
      ? "Mehrere Antworten derselben Person bleiben alle stehen. Einzelne Gäste könnt ihr absagen oder ganz löschen."
      : tab === "photos"
        ? "Freigegebene Bilder erscheinen auf der Bilder-Seite."
        : tab === "game"
          ? "Bis zu fünf Aufgaben. Punkte gibt es nur über den QR-Code der Aufgabe."
          : tab === "settings"
            ? "Bilder, der Foto-Button und das Spiel sind für Gäste nur sichtbar, solange sie eingeschaltet sind."
            : "Festplatte, Arbeitsspeicher und die Bilder auf diesem Server.";

  return (
    <div>
      <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl text-bronze sm:text-5xl">{title}</h1>
          <p className="mt-2 text-ink-soft">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {tab === "rsvp" ? (
            <a href="/api/admin/export" className="rounded-xl border border-wine px-4 py-2 text-sm text-wine hover:bg-wine hover:text-paper">
              Als CSV speichern
            </a>
          ) : null}
          <LogoutButton />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 print:hidden" role="tablist" aria-label="Bereiche">
        {(
          [
            ["rsvp", "Antworten"],
            ["photos", photosLabel],
            ["game", "Spiel"],
            ["settings", "Einstellungen"],
            ["server", "Server"],
          ] as const
        ).map(([value, label]) => {
          const selected = tab === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => select(value)}
              className={`rounded-xl border px-4 py-2 text-sm ${
                selected ? "border-wine bg-wine text-paper" : "border-line bg-paper text-ink hover:border-wine"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {tab === "rsvp" ? rsvp : tab === "photos" ? photos : tab === "game" ? game : tab === "settings" ? settings : server}
      </div>
    </div>
  );
}
