import type { RsvpRow } from "@/lib/db";
import { formatTimestamp } from "@/lib/format";
import type { PhotoRow } from "@/lib/photos";
import { AdminPhotos } from "@/components/admin-photos";
import { AdminRsvps } from "@/components/admin-rsvps";
import { AdminSettings } from "@/components/admin-settings";
import { AdminTabs } from "@/components/admin-tabs";

type Stats = {
  yes: number;
  no: number;
  people: number;
};

export function AdminDashboard({
  rows,
  stats,
  photos,
  galleryEnabled,
  uploadButtonEnabled,
  gameEnabled,
  game,
}: {
  rows: RsvpRow[];
  stats: Stats;
  photos: PhotoRow[];
  galleryEnabled: boolean;
  uploadButtonEnabled: boolean;
  gameEnabled: boolean;
  game: React.ReactNode;
}) {
  return (
    <AdminTabs
      pending={photos.filter((photo) => photo.status === "pending").length}
      rsvp={
        <AdminRsvps
          rows={rows.map((row) => ({ ...row, received: formatTimestamp(row.created_at) }))}
          stats={stats}
        />
      }
      photos={
        <AdminPhotos
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
      settings={
        <AdminSettings
          photosEnabled={galleryEnabled}
          uploadButtonEnabled={uploadButtonEnabled}
          gameEnabled={gameEnabled}
        />
      }
    />
  );
}
