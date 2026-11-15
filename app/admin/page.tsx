import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { listRsvps, summarize } from "@/lib/db";
import { getSettings } from "@/lib/game";
import { galleryEnabled, listPhotos, uploadButtonEnabled } from "@/lib/photos";
import { AdminGame } from "@/components/admin-game";
import { AdminLogin } from "@/components/admin-login";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata: Metadata = {
  title: "Antworten · Helen & Oliver",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminFrame><p className="text-ink-soft">Die Übersicht wird geladen…</p></AdminFrame>}>
      <AdminContent />
    </Suspense>
  );
}

async function AdminContent() {
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

  return (
    <AdminFrame>
      <AdminDashboard
        rows={listRsvps()}
        stats={summarize()}
        photos={listPhotos()}
        galleryEnabled={galleryEnabled()}
        uploadButtonEnabled={uploadButtonEnabled()}
        gameEnabled={getSettings().enabled}
        game={<AdminGame origin={requestOrigin(headerList)} />}
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
