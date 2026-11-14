import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { hasAccess } from "@/lib/access";
import { isAuthenticated } from "@/lib/auth";
import { galleryEnabled, getPhoto, photoFilePath } from "@/lib/photos";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photoId = Number(id);
  if (!Number.isInteger(photoId) || photoId < 1) {
    return new NextResponse(null, { status: 404 });
  }

  const photo = getPhoto(photoId);
  if (!photo) return new NextResponse(null, { status: 404 });

  const admin = await isAuthenticated();
  if (!admin && !galleryEnabled()) return new NextResponse(null, { status: 404 });
  const guest = photo.status === "approved" && (await hasAccess());
  if (!admin && !guest) return new NextResponse(null, { status: 404 });

  const file = photoFilePath(photo.filename);
  if (!file) return new NextResponse(null, { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await fs.readFile(file);
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": photo.status === "approved" ? "private, max-age=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
