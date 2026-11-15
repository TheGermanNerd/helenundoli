"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ServerUsage, UsageSlice } from "@/lib/server-usage";

const photoRows = [
  { key: "approved", label: "Freigegeben" },
  { key: "pending", label: "Wartend" },
  { key: "rejected", label: "Abgelehnt" },
] as const;

export function AdminServer({ usage }: { usage: ServerUsage }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-10">
      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => router.refresh())}
          className="rounded-xl border border-wine px-4 py-2 text-sm text-wine hover:bg-wine hover:text-paper disabled:opacity-60"
        >
          {pending ? "Wird geladen…" : "Aktualisieren"}
        </button>
      </div>

      <section className="border border-line bg-paper px-4 py-4">
        <h2 className="font-serif text-3xl text-bronze">Bilder</h2>
        <p className="mt-2 text-sm text-ink-soft">So viel Platz belegen die hochgeladenen Bilder auf diesem Server.</p>
        <p className="mt-3 text-sm">
          {formatBytes(usage.photos.total.bytes)} · {countLabel(usage.photos.total.count, "Bild", "Bilder")}
        </p>
        {usage.disk.total > 0 ? (
          <p className="mt-1 text-sm text-ink-soft">
            Das sind {formatPercent(usage.photos.total.bytes, usage.disk.total)} der Festplatte.
          </p>
        ) : null}
        <ul className="mt-4 space-y-2 text-sm">
          {photoRows.map((row) => (
            <UsageRow key={row.key} label={row.label} slice={usage.photos[row.key]} noun={["Bild", "Bilder"]} />
          ))}
          {usage.photos.orphans.count > 0 ? (
            <UsageRow label="Ohne Eintrag" slice={usage.photos.orphans} noun={["Datei", "Dateien"]} />
          ) : null}
        </ul>
      </section>

      <section className="border border-line bg-paper px-4 py-4">
        <h2 className="font-serif text-3xl text-bronze">Festplatte</h2>
        <p className="mt-2 text-sm text-ink-soft">Das Laufwerk, auf dem die Bilder liegen.</p>
        <p className="mt-3 text-sm">
          {formatBytes(usage.disk.used)} von {formatBytes(usage.disk.total)} belegt
        </p>
        <p className="mt-1 text-sm text-ink-soft">{formatBytes(usage.disk.free)} frei</p>
        <Meter used={usage.disk.used} total={usage.disk.total} label="Belegte Festplatte" />
      </section>

      <section className="border border-line bg-paper px-4 py-4">
        <h2 className="font-serif text-3xl text-bronze">Arbeitsspeicher</h2>
        <p className="mt-3 text-sm">
          {formatBytes(usage.memory.used)} von {formatBytes(usage.memory.total)} belegt
        </p>
        <p className="mt-1 text-sm text-ink-soft">{formatBytes(usage.memory.total - usage.memory.used)} frei</p>
        <Meter used={usage.memory.used} total={usage.memory.total} label="Belegter Arbeitsspeicher" />
      </section>

      <section className="border border-line bg-paper px-4 py-4">
        <h2 className="font-serif text-3xl text-bronze">Prozessor</h2>
        <p className="mt-2 text-sm text-ink-soft">Gemessen über die letzte Minute.</p>
        <p className="mt-3 text-sm">
          Last {formatLoad(usage.cpu.load)} bei {usage.cpu.cores} {usage.cpu.cores === 1 ? "Kern" : "Kernen"}
        </p>
        <Meter used={usage.cpu.load} total={usage.cpu.cores} label="Prozessorlast" />
      </section>
    </div>
  );
}

function UsageRow({
  label,
  slice,
  noun,
}: {
  label: string;
  slice: UsageSlice;
  noun: [string, string];
}) {
  return (
    <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
      <span>{label}</span>
      <span className="text-ink-soft">
        {formatBytes(slice.bytes)} · {countLabel(slice.count, noun[0], noun[1])}
      </span>
    </li>
  );
}

function Meter({ used, total, label }: { used: number; total: number; label: string }) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, used / total)) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <div
      className="mt-4 h-2 bg-line"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className="h-full bg-wine" style={{ width: `${percent}%` }} />
    </div>
  );
}

function formatBytes(bytes: number) {
  const safe = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = safe;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : 1;
  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)} ${units[unit]}`;
}

function formatPercent(used: number, total: number) {
  const value = total > 0 ? (used / total) * 100 : 0;
  if (value > 0 && value < 0.1) return "unter 0,1 %";
  return `${new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value)} %`;
}

function formatLoad(load: number) {
  const safe = Number.isFinite(load) && load > 0 ? load : 0;
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(safe);
}

function countLabel(count: number, one: string, many: string) {
  const safe = Number.isFinite(count) && count > 0 ? Math.round(count) : 0;
  return `${new Intl.NumberFormat("de-DE").format(safe)} ${safe === 1 ? one : many}`;
}
