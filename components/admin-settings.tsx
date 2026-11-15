"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTimeLocal, formatTimestamp } from "@/lib/format";

const fieldClass = "mt-2 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink scheme-light";

type SwitchProps = {
  enabled: boolean;
  enableAt: string | null;
  disableAt: string | null;
};

export function AdminSettings({
  photosEnabled,
  photosEnableAt,
  photosDisableAt,
  uploadButtonEnabled,
  uploadButtonEnableAt,
  uploadButtonDisableAt,
  gameEnabled,
}: {
  photosEnabled: boolean;
  photosEnableAt: string | null;
  photosDisableAt: string | null;
  uploadButtonEnabled: boolean;
  uploadButtonEnableAt: string | null;
  uploadButtonDisableAt: string | null;
  gameEnabled: boolean;
}) {
  return (
    <div className="space-y-10">
      <VisibilityCard
        enabled={photosEnabled}
        enableAt={photosEnableAt}
        disableAt={photosDisableAt}
        fieldId="photos"
        title="Bilder für Gäste"
        description="Der Menüpunkt und die Galerie sind nur sichtbar, solange die Bilder eingeschaltet sind."
        statusOn="Die Bilder sind eingeschaltet."
        statusOff="Die Bilder sind ausgeschaltet."
        showLabel="Bilder einschalten"
        hideLabel="Bilder ausschalten"
        onLabel="Einschalten am"
        offLabel="Ausschalten am"
        planKind="photos"
        toggleAction="setEnabled"
        scheduleAction="setGallerySchedule"
      />
      <VisibilityCard
        enabled={uploadButtonEnabled}
        enableAt={uploadButtonEnableAt}
        disableAt={uploadButtonDisableAt}
        fieldId="upload-button"
        title="Button „Fotos teilen“"
        description="Der runde Button oben auf der Seite führt dorthin, wo Gäste Fotos hochladen. Hier könnt ihr ihn ein- und ausblenden."
        statusOn="Der Button ist sichtbar."
        statusOff="Der Button ist versteckt."
        showLabel="Button zeigen"
        hideLabel="Button verstecken"
        onLabel="Zeigen am"
        offLabel="Verstecken am"
        planKind="button"
        toggleAction="setUploadButton"
        scheduleAction="setButtonSchedule"
      />
      <GameVisibility enabled={gameEnabled} />
    </div>
  );
}

function VisibilityCard({
  enabled,
  enableAt,
  disableAt,
  fieldId,
  title,
  description,
  statusOn,
  statusOff,
  showLabel,
  hideLabel,
  onLabel,
  offLabel,
  planKind,
  toggleAction,
  scheduleAction,
}: SwitchProps & {
  fieldId: string;
  title: string;
  description: string;
  statusOn: string;
  statusOff: string;
  showLabel: string;
  hideLabel: string;
  onLabel: string;
  offLabel: string;
  planKind: "photos" | "button";
  toggleAction: "setEnabled" | "setUploadButton";
  scheduleAction: "setGallerySchedule" | "setButtonSchedule";
}) {
  const toggle = useAdminPost("/api/admin/photos");
  const schedule = useAdminPost("/api/admin/photos");

  return (
    <section className="border border-line bg-paper px-4 py-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void toggle.post({ action: toggleAction, enabled: !enabled });
        }}
      >
        <h2 className="font-serif text-3xl text-bronze">{title}</h2>
        <p className="mt-2 text-sm text-ink-soft">{description}</p>
        <p className="mt-3 text-sm">{enabled ? statusOn : statusOff}</p>
        {toggle.error ? <ErrorNote message={toggle.error} /> : null}
        <button
          type="submit"
          disabled={toggle.pending}
          className="mt-4 rounded-xl bg-wine px-4 py-2 text-sm text-paper hover:bg-wine-deep disabled:opacity-60"
        >
          {toggle.pending ? "Wird gespeichert…" : enabled ? hideLabel : showLabel}
        </button>
      </form>
      <ScheduleForm
        fieldId={fieldId}
        enableAt={enableAt}
        disableAt={disableAt}
        onLabel={onLabel}
        offLabel={offLabel}
        plan={planText(planKind, enableAt, disableAt)}
        pending={schedule.pending}
        error={schedule.error}
        onSave={(nextOn, nextOff) => {
          void schedule.post({ action: scheduleAction, enableAt: nextOn, disableAt: nextOff });
        }}
        onClear={() => {
          void schedule.post({ action: scheduleAction, enableAt: null, disableAt: null });
        }}
      />
    </section>
  );
}

function ScheduleForm({
  fieldId,
  enableAt,
  disableAt,
  onLabel,
  offLabel,
  plan,
  pending,
  error,
  onSave,
  onClear,
}: {
  fieldId: string;
  enableAt: string | null;
  disableAt: string | null;
  onLabel: string;
  offLabel: string;
  plan: string | null;
  pending: boolean;
  error: string;
  onSave: (enableAt: string | null, disableAt: string | null) => void;
  onClear: () => void;
}) {
  const [on, setOn] = useState(enableAt ? formatDateTimeLocal(enableAt) : "");
  const [off, setOff] = useState(disableAt ? formatDateTimeLocal(disableAt) : "");

  useEffect(() => {
    setOn(enableAt ? formatDateTimeLocal(enableAt) : "");
    setOff(disableAt ? formatDateTimeLocal(disableAt) : "");
  }, [enableAt, disableAt]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(on || null, off || null);
      }}
      className="mt-5 border-t border-line pt-4"
    >
      <h3 className="text-sm font-medium">Zeitplan</h3>
      <p className="mt-1 text-sm text-ink-soft">
        Legt fest, wann sich das von selbst ändert. Die Uhrzeit ist deutsche Zeit.
      </p>
      {plan ? <p className="mt-3 text-sm">{plan}</p> : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${fieldId}-on`} className="text-sm font-medium">
            {onLabel}
          </label>
          <input
            id={`${fieldId}-on`}
            type="datetime-local"
            step={60}
            value={on}
            onChange={(event) => setOn(event.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor={`${fieldId}-off`} className="text-sm font-medium">
            {offLabel}
          </label>
          <input
            id={`${fieldId}-off`}
            type="datetime-local"
            step={60}
            value={off}
            onChange={(event) => setOff(event.target.value)}
            className={fieldClass}
          />
        </div>
      </div>
      {error ? <ErrorNote message={error} /> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-wine px-4 py-2 text-sm text-paper hover:bg-wine-deep disabled:opacity-60"
        >
          {pending ? "Wird gespeichert…" : "Zeitplan speichern"}
        </button>
        {enableAt || disableAt ? (
          <button
            type="button"
            disabled={pending}
            onClick={onClear}
            className="rounded-xl border border-wine px-4 py-2 text-sm text-wine hover:bg-wine hover:text-paper disabled:opacity-60"
          >
            Zeitplan löschen
          </button>
        ) : null}
      </div>
    </form>
  );
}

function planText(kind: "photos" | "button", enableAt: string | null, disableAt: string | null) {
  const on = enableAt ? when(enableAt) : null;
  const off = disableAt ? when(disableAt) : null;
  if (!on && !off) return null;
  const onFirst = !enableAt || !disableAt || Date.parse(enableAt) < Date.parse(disableAt);

  if (kind === "photos") {
    if (on && off) {
      return onFirst
        ? `Die Bilder gehen am ${on} an und am ${off} aus.`
        : `Die Bilder gehen am ${off} aus und am ${on} an.`;
    }
    return on ? `Die Bilder gehen am ${on} an.` : `Die Bilder gehen am ${off} aus.`;
  }

  if (on && off) {
    return onFirst
      ? `Der Button erscheint am ${on} und verschwindet am ${off}.`
      : `Der Button verschwindet am ${off} und erscheint am ${on}.`;
  }
  return on ? `Der Button erscheint am ${on}.` : `Der Button verschwindet am ${off}.`;
}

function when(iso: string) {
  return formatTimestamp(iso).replace(", ", " um ");
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
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-xl bg-wine px-4 py-2 text-sm text-paper hover:bg-wine-deep disabled:opacity-60"
      >
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
