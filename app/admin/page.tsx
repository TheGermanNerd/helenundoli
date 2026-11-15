import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getRsvpFieldRules, listRsvps, summarize } from "@/lib/db";
import { getSettings } from "@/lib/game";
import { listMealCatalog, listMealOptions } from "@/lib/meals";
import { autoApproveEnabled, gallerySwitches, listPhotos } from "@/lib/photos";
import { serverUsage } from "@/lib/server-usage";
import { AdminGame } from "@/components/admin-game";
import { AdminLogin } from "@/components/admin-login";
import { AdminDashboard } from "@/components/admin-dashboard";
import { adminTab } from "@/lib/admin-tab";

export const metadata: Metadata = {
  title: "Antworten · Helen & Oliver",
  robots: { index: false, follow: false },
};

export default function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ bereich?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<AdminFrame><p className="text-ink-soft">Die Übersicht wird geladen…</p></AdminFrame>}>
      <AdminContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminContent({
  searchParams,
}: {
  searchParams: Promise<{ bereich?: string | string[] }>;
}) {
  const signedIn = await isAuthenticated();
  if (!signedIn) {
    return (
      <AdminFrame>
        <AdminLogin />
      </AdminFrame>
    );
  }

  await connection();
  const headerList = await headers();
  const switches = gallerySwitches();
  const bereich = (await searchParams).bereich;
  const initialTab = adminTab(Array.isArray(bereich) ? bereich[0] : bereich);

  return (
    <AdminFrame>
      <AdminDashboard
        initialTab={initialTab}
        rows={listRsvps()}
        stats={summarize()}
        photos={listPhotos()}
        galleryEnabled={switches.gallery.enabled}
        galleryEnableAt={switches.gallery.enableAt}
        galleryDisableAt={switches.gallery.disableAt}
        uploadButtonEnabled={switches.button.enabled}
        uploadButtonEnableAt={switches.button.enableAt}
        uploadButtonDisableAt={switches.button.disableAt}
        autoApproveEnabled={autoApproveEnabled()}
        gameEnabled={getSettings().enabled}
        meals={listMealOptions()}
        fields={getRsvpFieldRules()}
        mealCatalog={listMealCatalog()}
        game={<AdminGame origin={requestOrigin(headerList)} />}
        usage={serverUsage()}
      />
    </AdminFrame>
  );
}

function requestOrigin(headerList: Headers) {
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const forwarded = headerList.get("x-forwarded-proto");
  const proto = forwarded ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

function AdminFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-gold/40 bg-linen/90 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="font-script text-3xl leading-none text-bronze">
            Helen & Oliver
          </Link>
          <Link href="/" className="font-serif text-[0.68rem] font-medium tracking-[0.16em] text-ink-soft uppercase hover:text-bronze">
            Zur Einladung
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}
