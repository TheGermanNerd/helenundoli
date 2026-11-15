import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasAccess } from "@/lib/access";
import { autoApproveEnabled, galleryEnabled, galleryPhotos } from "@/lib/photos";
import { AccessGate } from "@/components/access-gate";
import { PhotoGrid } from "@/components/photo-grid";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Bilder · Helen & Oliver",
  description: "Bilder von der Hochzeit von Helen und Oliver.",
};

export default function BilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center px-6 py-16">
          <p className="text-ink-soft">Die Bilder werden geladen…</p>
        </div>
      }
    >
      <BilderContent />
    </Suspense>
  );
}

async function BilderContent() {
  await connection();
  if (!galleryEnabled()) notFound();
  if (!(await hasAccess())) return <AccessGate />;
  const photos = await galleryPhotos();
  const autoApprove = autoApproveEnabled();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-5xl text-center">
            <p className="font-serif text-[0.68rem] font-medium tracking-[0.28em] text-olive uppercase">Erinnerungen</p>
            <h1 className="mt-3 font-serif text-4xl text-bronze sm:text-5xl">Bilder</h1>
            {autoApprove ? null : (
              <p className="mx-auto mt-4 max-w-lg text-ink-soft">
                Momente, die ihr mit uns geteilt habt. Neue Bilder erscheinen erst nach unserer Freigabe.
              </p>
            )}
          </div>
          {photos.length === 0 ? (
            <p className="mt-10 text-center font-serif text-2xl text-ink-soft">Noch keine Bilder.</p>
          ) : (
            <PhotoGrid photos={photos} />
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
