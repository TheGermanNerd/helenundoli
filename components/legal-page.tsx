import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

const textLink = "text-bronze underline decoration-gold decoration-1 underline-offset-4";

export function LegalPage({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-gold/40 bg-linen/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link href="/" className="font-script text-3xl leading-none text-bronze">
            Helen & Oliver
          </Link>
          <Link href="/" className="font-serif text-[0.68rem] font-medium tracking-[0.16em] text-ink-soft uppercase hover:text-bronze">
            Zur Einladung
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 py-12">
        <p className="font-serif text-[0.68rem] font-medium tracking-[0.28em] text-olive uppercase">{kicker}</p>
        <h1 className="mt-3 font-serif text-4xl text-bronze sm:text-5xl">{title}</h1>
        <div className="mt-10 space-y-10 text-[1.05rem] leading-relaxed">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-2xl text-bronze">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("http");
  return (
    <a href={href} className={textLink} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      {children}
    </a>
  );
}
