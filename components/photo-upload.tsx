"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_PHOTO_BYTES, MAX_PHOTOS } from "@/lib/photo-limits";

const fieldClass = "mt-2 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink";

export function PhotoUpload({ autoApprove = false }: { autoApprove?: boolean }) {
  const [name, setName] = useState("");
  const [caption, setCaption] = useState("");
  const [fax, setFax] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<{ name: string; saved: number; failed: number } | null>(null);

  if (done) {
    return (
      <div className="text-center" role="status">
        <p className="font-serif text-3xl leading-snug text-bronze">
          {autoApprove
            ? `Danke, ${done.name}. ${done.saved === 1 ? "Euer Bild ist" : `Eure ${done.saved} Bilder sind`} auf der Seite.`
            : `Danke, ${done.name}. Wir haben ${done.saved === 1 ? "euer Bild" : `eure ${done.saved} Bilder`} erhalten und schauen ${done.saved === 1 ? "es" : "sie"} uns an.`}
        </p>
        {done.failed > 0 ? (
          <p className="mt-4 text-ink-soft">
            {done.failed === 1 ? "Ein Bild" : `${done.failed} Bilder`} konnten wir nicht lesen.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setDone(null);
            setCaption("");
            setFiles([]);
            setError("");
          }}
          className="mt-8 rounded-xl border border-wine px-5 py-3 text-wine hover:bg-wine hover:text-paper"
        >
          Weitere Bilder teilen
        </button>
      </div>
    );
  }

  function formError() {
    const cleanName = name.replace(/\s+/g, " ").trim();
    if (!cleanName) return "Bitte gebt einen Namen an.";
    if (cleanName.length > 120) return "Der Name ist zu lang.";
    if (caption.trim().length > 240) return "Der Bildtext ist zu lang.";
    if (files.length === 0) return "Bitte wählt mindestens ein Bild aus.";
    if (files.length > MAX_PHOTOS) return "Bitte höchstens 12 Bilder auf einmal.";
    if (files.some((file) => file.size > MAX_PHOTO_BYTES)) return "Ein Bild ist größer als 12 MB.";
    return "";
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    const problem = formError();
    if (problem) {
      setError(problem);
      return;
    }
    setConfirming(true);
  }

  async function upload() {
    const cleanName = name.replace(/\s+/g, " ").trim();
    const body = new FormData();
    body.set("name", cleanName);
    body.set("caption", caption);
    body.set("fax", fax);
    for (const file of files) body.append("photos", file);

    setConfirming(false);
    setPending(true);
    try {
      const response = await fetch("/api/photos", { method: "POST", body });
      const data = (await response.json().catch(() => null)) as { error?: string; saved?: number; failed?: number } | null;
      if (!response.ok) {
        setError(data?.error ?? "Die Bilder konnten nicht gespeichert werden. Bitte versucht es noch einmal.");
        return;
      }
      setDone({
        name: cleanName,
        saved: data?.saved ? data.saved : files.length,
        failed: data?.failed ?? 0,
      });
    } catch {
      setError("Die Verbindung hat nicht geklappt. Bitte versucht es noch einmal.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="text-center">
        <h1 className="font-serif text-4xl text-bronze sm:text-5xl">Fotos teilen</h1>
        <p className="mx-auto mt-4 max-w-md text-ink-soft">
          {autoApprove
            ? "Die Bilder erscheinen direkt auf der Bilder-Seite."
            : "Wir schauen die Bilder an, bevor sie auf der Seite erscheinen."}
        </p>
      </div>
      <p className="text-sm text-ink-soft">Pflichtfelder sind mit * markiert. Bis zu 12 Bilder, höchstens 12 MB pro Bild.</p>
      {error ? (
        <p role="alert" className="border border-wine/30 bg-wine/5 px-3 py-2 text-wine">
          {error}
        </p>
      ) : null}

      <div className="sr-only" aria-hidden="true">
        <label htmlFor="fax">Fax</label>
        <input
          id="fax"
          name="fax"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={fax}
          onChange={(event) => setFax(event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="name" className="text-sm font-medium">
          Name *
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="caption" className="text-sm font-medium">
          Bildtext
        </label>
        <textarea
          id="caption"
          name="caption"
          rows={3}
          maxLength={240}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          className={fieldClass}
        />
        <p className="mt-1 text-sm text-ink-soft">Gilt für alle Bilder in diesem Durchgang.</p>
      </div>

      <div>
        <label htmlFor="photos" className="text-sm font-medium">
          Bilder *
        </label>
        <input
          id="photos"
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          multiple
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          className="mt-2 block w-full text-sm text-ink-soft file:mr-3 file:rounded-xl file:border file:border-wine file:bg-paper file:px-3 file:py-2 file:text-wine"
        />
        {files.length > 0 ? (
          <ul className="mt-2 text-sm text-ink-soft">
            {files.map((file, index) => (
              <li key={`${file.name}-${file.size}-${index}`}>{file.name}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-wine px-5 py-3 text-paper hover:bg-wine-deep disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Wird gesendet…" : "Bilder senden"}
      </button>
    </form>
    <ApprovalNote
      open={confirming}
      autoApprove={autoApprove}
      onCancel={() => setConfirming(false)}
      onConfirm={upload}
    />
    </>
  );
}

function ApprovalNote({
  open,
  autoApprove,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  autoApprove: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLButtonElement>("[data-confirm]")?.focus();
    return () => {
      if (!dialog.open) return;
      closing.current = true;
      dialog.close();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="photo-approval-title"
      aria-describedby="photo-approval-note"
      className="approval-dialog"
      onClose={() => {
        if (closing.current) {
          closing.current = false;
          return;
        }
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onCancel();
      }}
    >
      <div className="bg-paper px-6 py-8 text-left text-ink sm:px-8">
        <h2 id="photo-approval-title" className="font-serif text-3xl text-bronze">
          {autoApprove ? "Direkt auf der Seite" : "Noch nicht sichtbar"}
        </h2>
        <p id="photo-approval-note" className="mt-4 leading-relaxed text-ink-soft">
          {autoApprove
            ? "Die hochgeladenen Bilder sind danach in der Kategorie „Bilder“ zu sehen."
            : "Die hochgeladenen Bilder sind in der Kategorie „Bilder“ erst zu sehen, nachdem wir sie freigegeben haben."}
        </p>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="rounded-xl border border-line px-5 py-3 text-ink hover:border-wine">
            Zurück
          </button>
          <button
            type="button"
            data-confirm
            onClick={onConfirm}
            className="rounded-xl bg-wine px-5 py-3 text-paper hover:bg-wine-deep"
          >
            Jetzt senden
          </button>
        </div>
      </div>
    </dialog>
  );
}
