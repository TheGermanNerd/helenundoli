import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasAccess } from "@/lib/access";
import { autoApproveEnabled, uploadButtonEnabled } from "@/lib/photos";
import { AccessGate } from "@/components/access-gate";
import { PhotoUpload } from "@/components/photo-upload";
import { Stationery } from "@/components/ornaments";

export const metadata: Metadata = {
  title: "Fotos teilen · Helen & Oliver",
  robots: { index: false, follow: false },
};

export default function FotosPage() {
  return (
    <Suspense
      fallback={
        <GuestFrame>
          <p className="text-center text-ink-soft">Die Seite wird geladen…</p>
        </GuestFrame>
      }
    >
      <FotosContent />
    </Suspense>
  );
}

async function FotosContent() {
  await connection();
  if (!uploadButtonEnabled()) notFound();
  if (!(await hasAccess())) return <AccessGate />;

  return (
    <GuestFrame>
      <PhotoUpload autoApprove={autoApproveEnabled()} />
    </GuestFrame>
  );
}

function GuestFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-gold/40 bg-linen/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link href="/" className="font-script text-3xl leading-none text-bronze">
            Helen & Oliver
          </Link>
          <Link
            href="/"
            className="font-serif text-[0.68rem] font-medium tracking-[0.16em] text-ink-soft uppercase hover:text-bronze"
          >
            Zur Einladung
          </Link>
        </div>
      </header>
      <main className="px-4 py-8 sm:px-6">
        <Stationery className="mx-auto max-w-2xl">
          <div className="px-6 py-12 sm:px-10 sm:py-14">{children}</div>
        </Stationery>
      </main>
    </div>
  );
}
