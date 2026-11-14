import { Suspense } from "react";
import { hasAccess } from "@/lib/access";
import { AccessGate } from "@/components/access-gate";
import { SiteHeader } from "@/components/site-header";
import { Welcome } from "@/components/welcome";
import { Details } from "@/components/details";
import { Schedule } from "@/components/schedule";
import { Faq } from "@/components/faq";
import { RsvpSection } from "@/components/rsvp-section";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center px-6 py-16">
          <p className="text-ink-soft">Die Einladung wird geladen…</p>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  if (!(await hasAccess())) return <AccessGate />;

  return (
    <>
      <SiteHeader />
      <main>
        <Welcome />
        <Details />
        <Schedule />
        <RsvpSection />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
