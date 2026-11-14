import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasAccess } from "@/lib/access";
import { getClaimPreview, getSettings, PLAYER_COOKIE } from "@/lib/game";
import { pointsLabel } from "@/lib/game-input";
import { AccessGate } from "@/components/access-gate";
import { ClaimForm } from "@/components/claim-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Aufgabe · Helen & Oliver",
  robots: { index: false, follow: false },
};

export default function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center px-6 py-16">
          <p className="text-ink-soft">Die Aufgabe wird geladen…</p>
        </div>
      }
    >
      <ClaimContent params={params} />
    </Suspense>
  );
}

async function ClaimContent({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  if (!getSettings().enabled) notFound();
  if (!(await hasAccess())) return <AccessGate />;
  const { token } = await params;
  const playerToken = (await cookies()).get(PLAYER_COOKIE)?.value ?? null;
  const preview = getClaimPreview(playerToken, token);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-lg border border-line bg-paper px-5 py-6 sm:px-8">
            {preview.status === "unknown" ? (
              <UnknownCode />
            ) : (
              <>
                <p className="font-serif text-[0.68rem] font-medium tracking-[0.28em] text-olive uppercase">Aufgabe</p>
                <h1 className="mt-3 font-serif text-4xl text-bronze">{preview.title}</h1>
                <p className="mt-3 text-olive">{pointsLabel(preview.points)}</p>
                <p className="mt-4 whitespace-pre-wrap text-ink-soft">{preview.instruction}</p>
                {preview.already ? <AlreadyDone /> : <ClaimForm token={token} playerName={preview.playerName} />}
              </>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function UnknownCode() {
  return (
    <div className="text-center">
      <h1 className="font-serif text-4xl text-bronze">Unbekannter Code</h1>
      <p className="mt-4 text-ink-soft">Diesen Code kennen wir nicht.</p>
      <Link href="/spiel" className="mt-6 inline-block bg-wine px-4 py-3 text-paper hover:bg-wine-deep">
        Zum Spiel
      </Link>
    </div>
  );
}

function AlreadyDone() {
  return (
    <div className="mt-6 text-center">
      <p className="font-serif text-3xl text-bronze">Die Aufgabe hast du schon.</p>
      <p className="mt-3 text-ink-soft">Sie zählt nur einmal.</p>
      <Link href="/spiel" className="mt-6 inline-block bg-wine px-4 py-3 text-paper hover:bg-wine-deep">
        Zum Spiel
      </Link>
    </div>
  );
}
