"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatTimestamp } from "@/lib/format";

type PhotoStatus = "pending" | "approved" | "rejected";

export type AdminPhoto = {
  id: number;
  name: string;
  caption: string | null;
  status: PhotoStatus;
  created_at: string;
};

const groups = [
  { status: "pending", title: "Warten auf Freigabe" },
  { status: "approved", title: "Auf der Seite" },
  { status: "rejected", title: "Abgelehnt" },
] as const;

function AutoApprove({ autoApprove }: { autoApprove: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function toggle(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setAutoApprove", enabled: !autoApprove }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Das hat nicht geklappt.");
        return;
      }
      router.refresh();
    } catch {
      setError("Die Verbindung hat nicht geklappt. Bitte versucht es noch einmal.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={toggle} className="border border-line bg-paper px-4 py-4">
      <h2 className="font-serif text-3xl text-bronze">Automatisch freigeben</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Neue Bilder erscheinen sofort auf der Bilder-Seite. Bilder, die schon auf Freigabe warten, bleiben liegen.
      </p>
      <p className="mt-3 text-sm">
        {autoApprove ? "Neue Bilder werden automatisch freigegeben." : "Neue Bilder warten auf Freigabe."}
      </p>
      {error ? (
        <p role="alert" className="mt-3 border border-wine/30 bg-wine/5 px-3 py-2 text-wine">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-xl bg-wine px-4 py-2 text-sm text-paper hover:bg-wine-deep disabled:opacity-60"
      >
        {pending ? "Wird gespeichert…" : autoApprove ? "Wieder manuell freigeben" : "Automatisch freigeben"}
      </button>
    </form>
  );
}

const statusLabel: Record<PhotoStatus, string> = {
  pending: "Wartet",
  approved: "Auf der Seite",
  rejected: "Abgelehnt",
};

export function AdminPhotos({ photos, autoApprove }: { photos: AdminPhoto[]; autoApprove: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    const ids = new Set(photos.map((photo) => photo.id));
    setSelected((current) => {
      const next = new Set([...current].filter((id) => ids.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [photos]);

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) =>
      current.size === photos.length ? new Set() : new Set(photos.map((photo) => photo.id)),
    );
  }

  async function act(id: number, action: "approve" | "reject" | "delete") {
    if (action === "delete" && !window.confirm("Dieses Bild wirklich löschen?")) return;
    setBusy(id);
    setError("");
    try {
      const response = await fetch("/api/admin/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Das hat nicht geklappt.");
        return;
      }
      router.refresh();
    } catch {
      setError("Die Verbindung hat nicht geklappt. Bitte versucht es noch einmal.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-10">
      <AutoApprove autoApprove={autoApprove} />
      {error ? (
        <p role="alert" className="border border-wine/30 bg-wine/5 px-3 py-2 text-wine">
          {error}
        </p>
      ) : null}
      {photos.length === 0 ? <p className="font-serif text-2xl text-ink-soft">Noch keine Bilder.</p> : null}
      {photos.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              ref={(element) => {
                if (element) element.indeterminate = selected.size > 0 && selected.size < photos.length;
              }}
              type="checkbox"
              checked={selected.size === photos.length}
              onChange={toggleAll}
              className="size-4 accent-wine"
            />
            Alle auswählen
          </label>
          <a
            href="/api/admin/photos/zip"
            className="rounded-xl border border-wine px-4 py-2 text-sm text-wine hover:bg-wine hover:text-paper"
          >
            Alle als ZIP
          </a>
          {selected.size > 0 ? (
            <a
              href={`/api/admin/photos/zip?ids=${[...selected].join(",")}`}
              className="rounded-xl border border-wine px-4 py-2 text-sm text-wine hover:bg-wine hover:text-paper"
            >
              Auswahl als ZIP
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="rounded-xl border border-wine px-4 py-2 text-sm text-wine disabled:opacity-60"
            >
              Auswahl als ZIP
            </button>
          )}
        </div>
      ) : null}
      {groups.map((group) => {
        const rows = photos.filter((photo) => photo.status === group.status);
        if (rows.length === 0) return null;
        return (
          <section key={group.status}>
            <h2 className="font-serif text-2xl text-bronze">{group.title}</h2>
            <ul className="mt-4 space-y-4">
              {rows.map((photo) => (
                <li key={photo.id} className="grid gap-4 border border-line bg-paper p-4 sm:grid-cols-[8rem_1fr]">
                  <div className="relative h-32 w-full sm:w-32">
                    <Image
                      src={`/api/photos/${photo.id}`}
                      alt={photo.caption ? `${photo.caption}, Foto von ${photo.name}` : `Foto von ${photo.name}`}
                      fill
                      unoptimized
                      sizes="128px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 font-medium">
                      <input
                        type="checkbox"
                        checked={selected.has(photo.id)}
                        onChange={() => toggle(photo.id)}
                        aria-label={`Bild von ${photo.name} auswählen`}
                        className="size-4 accent-wine"
                      />
                      {photo.name}
                    </label>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{photo.caption?.trim() ? photo.caption : "—"}</p>
                    <p className="mt-2 text-sm text-ink-soft">
                      {statusLabel[photo.status]} · {formatTimestamp(photo.created_at)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {photo.status !== "approved" ? (
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => act(photo.id, "approve")}
                          className="rounded-xl bg-wine px-3 py-2 text-sm text-paper hover:bg-wine-deep disabled:opacity-60"
                        >
                          {busy === photo.id ? "Wird gespeichert…" : "Freigeben"}
                        </button>
                      ) : null}
                      {photo.status !== "rejected" ? (
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => act(photo.id, "reject")}
                          className="rounded-xl border border-wine px-3 py-2 text-sm text-wine hover:bg-wine hover:text-paper disabled:opacity-60"
                        >
                          Ablehnen
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => act(photo.id, "delete")}
                        className="px-3 py-2 text-sm text-wine hover:underline disabled:opacity-60"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
