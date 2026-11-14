import type { RsvpRow } from "@/lib/db";
import { formatTimestamp } from "@/lib/format";
import type { PhotoRow } from "@/lib/photos";
import { mealLabel } from "@/lib/rsvp";
import { AdminPhotos } from "@/components/admin-photos";
import { AdminTabs } from "@/components/admin-tabs";

type Stats = {
  yes: number;
  no: number;
  people: number;
};

function text(value: string | null) {
  return value && value.trim() ? value : "—";
}

export function AdminDashboard({
  rows,
  stats,
  photos,
  galleryEnabled,
  game,
}: {
  rows: RsvpRow[];
  stats: Stats;
  photos: PhotoRow[];
  galleryEnabled: boolean;
  game: React.ReactNode;
}) {
  return (
    <AdminTabs
      pending={photos.filter((photo) => photo.status === "pending").length}
      rsvp={<RsvpPanel rows={rows} stats={stats} />}
      photos={
        <AdminPhotos
          enabled={galleryEnabled}
          photos={photos.map((photo) => ({
            id: photo.id,
            name: photo.name,
            caption: photo.caption,
            status: photo.status,
            created_at: photo.created_at,
          }))}
        />
      }
      game={game}
    />
  );
}

function RsvpPanel({ rows, stats }: { rows: RsvpRow[]; stats: Stats }) {
  return (
    <div>
      <dl className="grid grid-cols-3 gap-3">
        {[
          ["Zusagen", stats.yes],
          ["Absagen", stats.no],
          ["Personen", stats.people],
        ].map(([label, value]) => (
          <div key={label} className="border border-line bg-paper px-4 py-4">
            <dt className="text-xs font-medium uppercase tracking-[0.16em] text-olive">{label}</dt>
            <dd className="mt-2 font-serif text-4xl text-bronze">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-ink-soft">Personen zählt alle Gäste der Zusagen.</p>

      {rows.length === 0 ? (
        <p className="mt-10 font-serif text-2xl text-ink-soft">Noch keine Antworten.</p>
      ) : (
        <div className="mt-8 overflow-x-auto border border-line bg-paper">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <caption className="sr-only">Eingegangene Antworten</caption>
            <thead className="border-b border-line text-xs uppercase tracking-[0.14em] text-olive">
              <tr>
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">E-Mail</th>
                <th className="px-3 py-3 font-medium">Teilnahme</th>
                <th className="px-3 py-3 font-medium">Personen</th>
                <th className="px-3 py-3 font-medium">Gäste</th>
                <th className="px-3 py-3 font-medium">Menü</th>
                <th className="px-3 py-3 font-medium">Nachricht</th>
                <th className="px-3 py-3 font-medium">Eingegangen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line align-top last:border-b-0">
                  <td className="px-3 py-3">{row.name}</td>
                  <td className="px-3 py-3 break-all">{row.email}</td>
                  <td className="px-3 py-3">{row.attending ? "Zusage" : "Absage"}</td>
                  <td className="px-3 py-3">{row.attending ? row.guest_count : "—"}</td>
                  <td className="px-3 py-3 whitespace-pre-wrap">{text(row.guest_names)}</td>
                  <td className="px-3 py-3 whitespace-pre-wrap">{row.attending ? mealLabel(row.meal) : "—"}</td>
                  <td className="max-w-xs px-3 py-3 whitespace-pre-wrap">{text(row.message)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatTimestamp(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
