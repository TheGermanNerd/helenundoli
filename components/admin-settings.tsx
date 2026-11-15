"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSettings({
  photosEnabled,
  uploadButtonEnabled,
  gameEnabled,
}: {
  photosEnabled: boolean;
  uploadButtonEnabled: boolean;
  gameEnabled: boolean;
}) {
  return (
    <div className="space-y-10">
      <PhotosVisibility enabled={photosEnabled} />
      <UploadButtonVisibility enabled={uploadButtonEnabled} />
      <GameVisibility enabled={gameEnabled} />
    </div>
  );
}

function PhotosVisibility({ enabled }: { enabled: boolean }) {
  const { post, pending, error } = useAdminPost("/api/admin/photos");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void post({ action: "setEnabled", enabled: !enabled });
      }}
      className="border border-line bg-paper px-4 py-4"
    >
      <h2 className="font-serif text-3xl text-bronze">Bilder für Gäste</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Der Menüpunkt und die Galerie sind nur sichtbar, solange die Bilder eingeschaltet sind.
      </p>
      <p className="mt-3 text-sm">{enabled ? "Die Bilder sind eingeschaltet." : "Die Bilder sind ausgeschaltet."}</p>
      {error ? <ErrorNote message={error} /> : null}
      <button type="submit" disabled={pending} className="mt-4 rounded-xl bg-wine px-4 py-2 text-sm text-paper hover:bg-wine-deep disabled:opacity-60">
        {pending ? "Wird gespeichert…" : enabled ? "Bilder ausschalten" : "Bilder einschalten"}
      </button>
    </form>
  );
}

function UploadButtonVisibility({ enabled }: { enabled: boolean }) {
  const { post, pending, error } = useAdminPost("/api/admin/photos");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void post({ action: "setUploadButton", enabled: !enabled });
      }}
      className="border border-line bg-paper px-4 py-4"
    >
      <h2 className="font-serif text-3xl text-bronze">Button „Fotos teilen“</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Der runde Button oben auf der Seite führt dorthin, wo Gäste Fotos hochladen. Hier könnt ihr ihn ein- und
        ausblenden.
      </p>
      <p className="mt-3 text-sm">{enabled ? "Der Button ist sichtbar." : "Der Button ist versteckt."}</p>
      {error ? <ErrorNote message={error} /> : null}
      <button type="submit" disabled={pending} className="mt-4 rounded-xl bg-wine px-4 py-2 text-sm text-paper hover:bg-wine-deep disabled:opacity-60">
        {pending ? "Wird gespeichert…" : enabled ? "Button verstecken" : "Button zeigen"}
      </button>
    </form>
  );
}

function GameVisibility({ enabled }: { enabled: boolean }) {
  const { post, pending, error } = useAdminPost("/api/admin/game");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void post({ action: "setEnabled", enabled: !enabled });
      }}
      className="border border-line bg-paper px-4 py-4"
    >
      <h2 className="font-serif text-3xl text-bronze">Spiel für Gäste</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Der Menüpunkt und die Seite sind nur sichtbar, solange das Spiel eingeschaltet ist.
      </p>
      <p className="mt-3 text-sm">{enabled ? "Das Spiel ist eingeschaltet." : "Das Spiel ist ausgeschaltet."}</p>
      {error ? <ErrorNote message={error} /> : null}
      <button type="submit" disabled={pending} className="mt-4 rounded-xl bg-wine px-4 py-2 text-sm text-paper hover:bg-wine-deep disabled:opacity-60">
        {pending ? "Wird gespeichert…" : enabled ? "Spiel ausschalten" : "Spiel einschalten"}
      </button>
    </form>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-3 border border-wine/30 bg-wine/5 px-3 py-2 text-wine">
      {message}
    </p>
  );
}

function useAdminPost(url: string) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function post(body: Record<string, unknown>) {
    setPending(true);
    setError("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  return { post, pending, error };
}
