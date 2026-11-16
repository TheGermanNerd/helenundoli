"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { COOKIE_NOTICE_KEY } from "@/lib/legal";

const linkClass = "text-bronze underline decoration-gold decoration-1 underline-offset-4";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(COOKIE_NOTICE_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function acknowledge() {
    try {
      localStorage.setItem(COOKIE_NOTICE_KEY, "1");
    } catch {
      // The notice can still close for this view if the browser blocks storage.
    }
    setVisible(false);
  }

  return (
    <>
      <div aria-hidden="true" className="h-36 shrink-0" />
      <div
        role="region"
        aria-label="Hinweis zu Cookies"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/50 bg-cream/95 px-5 py-4 shadow-[0_-12px_30px_-20px_rgba(92,67,50,0.45)] backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm leading-relaxed text-ink">
            Diese Website speichert nur, was sie zum Funktionieren braucht: den Zugang zur Einladung, auf Wunsch euer
            Spiel und dass ihr diesen Hinweis gesehen habt. Analyse- und Werbe-Cookies setzen wir nicht ein.{" "}
            <Link href="/datenschutz" className={linkClass}>
              Datenschutz
            </Link>
            {" · "}
            <Link href="/impressum" className={linkClass}>
              Impressum
            </Link>
          </p>
          <button
            type="button"
            onClick={acknowledge}
            className="shrink-0 rounded-xl bg-wine px-5 py-2.5 text-paper hover:bg-wine-deep"
          >
            Verstanden
          </button>
        </div>
      </div>
    </>
  );
}
