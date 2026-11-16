import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Great_Vibes, Source_Sans_3 } from "next/font/google";
import { connection } from "next/server";
import { CookieNotice } from "@/components/cookie-notice";
import { SaveTheDate } from "@/components/save-the-date";
import { saveTheDateEnabled } from "@/lib/site-settings";
import "./globals.css";

const script = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin"],
  weight: "400",
});

const serif = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

const sans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Helen & Oliver",
  description: "Wir heiraten. Hier findet ihr Datum, Ort und Ablauf und könnt uns zusagen.",
};

export const viewport: Viewport = {
  themeColor: "#e6d5c3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${serif.variable} ${sans.variable} ${script.variable} h-full antialiased`}>
      <body className="min-h-full bg-linen font-sans text-ink">
        {children}
        <CookieNotice />
        <Suspense fallback={null}>
          <SaveTheDateGate />
        </Suspense>
      </body>
    </html>
  );
}

async function SaveTheDateGate() {
  await connection();
  if (!saveTheDateEnabled()) return null;
  return <SaveTheDate />;
}
