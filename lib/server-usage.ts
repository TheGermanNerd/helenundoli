import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { listPhotos, photoFilePath, type PhotoStatus } from "@/lib/photos";

export type UsageSlice = {
  bytes: number;
  count: number;
};

export type ServerUsage = {
  photos: {
    total: UsageSlice;
    approved: UsageSlice;
    pending: UsageSlice;
    rejected: UsageSlice;
    orphans: UsageSlice;
  };
  disk: {
    used: number;
    free: number;
    total: number;
  };
  memory: {
    used: number;
    total: number;
  };
  cpu: {
    load: number;
    cores: number;
  };
};

function photosDir() {
  const dir = path.join(process.cwd(), "data", "photos");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function regularFileSize(file: string) {
  try {
    const stat = fs.statSync(file);
    return stat.isFile() ? stat.size : null;
  } catch {
    return null;
  }
}

function emptySlice(): UsageSlice {
  return { bytes: 0, count: 0 };
}

export function serverUsage(): ServerUsage {
  const dir = photosDir();
  const rows = listPhotos();
  const known = new Set(rows.map((photo) => photo.filename));
  const buckets: Record<PhotoStatus, UsageSlice> = {
    pending: emptySlice(),
    approved: emptySlice(),
    rejected: emptySlice(),
  };

  for (const photo of rows) {
    const slice = buckets[photo.status];
    slice.count += 1;
    const file = photoFilePath(photo.filename);
    if (!file) continue;
    const size = regularFileSize(file);
    if (size !== null) slice.bytes += size;
  }

  const orphans = emptySlice();
  for (const name of fs.readdirSync(dir)) {
    if (known.has(name)) continue;
    const size = regularFileSize(path.join(dir, name));
    if (size === null) continue;
    orphans.count += 1;
    orphans.bytes += size;
  }

  const space = fs.statfsSync(dir);
  const diskTotal = Number(space.blocks) * Number(space.bsize);
  const diskFree = Number(space.bavail) * Number(space.bsize);
  const memoryTotal = os.totalmem();

  return {
    photos: {
      total: {
        bytes: buckets.approved.bytes + buckets.pending.bytes + buckets.rejected.bytes + orphans.bytes,
        count: buckets.approved.count + buckets.pending.count + buckets.rejected.count,
      },
      approved: buckets.approved,
      pending: buckets.pending,
      rejected: buckets.rejected,
      orphans,
    },
    disk: {
      used: Math.max(0, diskTotal - diskFree),
      free: Math.max(0, diskFree),
      total: Math.max(0, diskTotal),
    },
    memory: {
      used: Math.max(0, memoryTotal - os.freemem()),
      total: memoryTotal,
    },
    cpu: {
      load: os.loadavg()[0] ?? 0,
      cores: Math.max(1, os.cpus().length),
    },
  };
}
