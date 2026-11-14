import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasAccess } from "@/lib/access";
import { getGameView, getSettings, PLAYER_COOKIE } from "@/lib/game";
import { AccessGate } from "@/components/access-gate";
import { GameBoard } from "@/components/game-board";
import { GameProfile } from "@/components/game-profile";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Spiel · Helen & Oli",
  description: "Aufgaben erledigen, QR-Code scannen und Punkte für den Preis sammeln.",
};

export default function SpielPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center px-6 py-16">
          <p className="text-ink-soft">Das Spiel wird geladen…</p>
        </div>
      }
    >
      <SpielContent />
    </Suspense>
  );
}

async function SpielContent() {
  await connection();
  if (!getSettings().enabled) notFound();
  if (!(await hasAccess())) return <AccessGate />;
  const token = (await cookies()).get(PLAYER_COOKIE)?.value ?? null;
  const view = getGameView(token);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <p className="text-center font-serif text-[0.68rem] font-medium tracking-[0.28em] text-olive uppercase">Mitspielen</p>
            <h1 className="mt-3 text-center font-serif text-4xl text-bronze sm:text-5xl">Spiel</h1>
            <p className="mx-auto mt-4 max-w-md text-center text-ink-soft">
              Erledige die Aufgaben vor Ort. Punkte gibt es erst, wenn du den QR-Code der Aufgabe scannst und bestätigst.
            </p>
            <GameProfile name={view.playerName} />
            {view.tasks.length === 0 ? (
              <p className="mt-8 text-center font-serif text-2xl text-ink-soft">Das Spiel hat noch nicht begonnen.</p>
            ) : (
              <GameBoard view={view} />
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
