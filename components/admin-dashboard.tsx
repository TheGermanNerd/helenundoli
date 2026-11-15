import type { RsvpRow } from "@/lib/db";
import { formatTimestamp } from "@/lib/format";
import type { PhotoRow } from "@/lib/photos";
import { AdminPhotos } from "@/components/admin-photos";
import { AdminRsvps } from "@/components/admin-rsvps";
import { AdminServer } from "@/components/admin-server";
import { AdminSettings } from "@/components/admin-settings";
import { AdminTabs } from "@/components/admin-tabs";
import type { AdminTab } from "@/lib/admin-tab";
import type { ServerUsage } from "@/lib/server-usage";

type Stats = {
  yes: number;
  no: number;
  people: number;
};

export function AdminDashboard({
  initialTab,
  rows,
  stats,
  photos,
  galleryEnabled,
  galleryEnableAt,
  galleryDisableAt,
  uploadButtonEnabled,
  uploadButtonEnableAt,
  uploadButtonDisableAt,
  autoApproveEnabled,
  gameEnabled,
  game,
  usage,
}: {
  initialTab: AdminTab;
  rows: RsvpRow[];
  stats: Stats;
  photos: PhotoRow[];
  galleryEnabled: boolean;
  galleryEnableAt: string | null;
  galleryDisableAt: string | null;
  uploadButtonEnabled: boolean;
  uploadButtonEnableAt: string | null;
  uploadButtonDisableAt: string | null;
  autoApproveEnabled: boolean;
  gameEnabled: boolean;
  game: React.ReactNode;
  usage: ServerUsage;
}) {
  return (
    <AdminTabs
      initialTab={initialTab}
      pending={photos.filter((photo) => photo.status === "pending").length}
      rsvp={
        <AdminRsvps
          rows={rows.map((row) => ({ ...row, received: formatTimestamp(row.created_at) }))}
          stats={stats}
        />
      }
      photos={
        <AdminPhotos
          autoApprove={autoApproveEnabled}
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
          photosEnableAt={galleryEnableAt}
          photosDisableAt={galleryDisableAt}
          uploadButtonEnabled={uploadButtonEnabled}
          uploadButtonEnableAt={uploadButtonEnableAt}
          uploadButtonDisableAt={uploadButtonDisableAt}
          gameEnabled={gameEnabled}
        />
      }
      server={<AdminServer usage={usage} />}
    />
  );
}
