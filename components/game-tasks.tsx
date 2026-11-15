"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isTaskToken, pointsLabel } from "@/lib/game-input";
import type { GameTaskView } from "@/lib/game";

type ScanSession = {
  taskId: number;
  title: string;
  stream: MediaStream;
};

type Claimed = {
  status: "ok" | "already";
  points: number;
  score: number;
};

export function GameTasks({ tasks, playerName }: { tasks: GameTaskView[]; playerName: string | null }) {
  const alive = useRef(true);
  const opening = useRef(false);
  const [scan, setScan] = useState<ScanSession | null>(null);
  const [hint, setHint] = useState("");

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function onOpen(task: GameTaskView) {
    if (opening.current || scan) return;
    if (!playerName) {
      setHint("Trag zuerst deinen Namen ein.");
      const field = document.getElementById("player-name");
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setHint("Die Kamera geht nur über eine sichere Verbindung.");
      return;
    }

    opening.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      if (!alive.current) {
        stopStream(stream);
        return;
      }
      setHint("");
      setScan({ taskId: task.id, title: task.title, stream });
    } catch (error) {
      setHint(cameraMessage(error));
    } finally {
      opening.current = false;
    }
  }

  return (
    <>
      {hint ? (
        <p role="alert" className="mt-4 border border-wine/30 bg-wine/5 px-3 py-2 text-wine">
          {hint}
        </p>
      ) : null}
      <ol className="mt-4 space-y-4">
        {tasks.map((task, index) => (
          <li key={task.id}>
            {task.done ? (
              <div className="border border-line bg-paper px-4 py-4">
                <TaskCopy task={task} index={index} />
                <p className="mt-3 text-sm font-medium text-olive">Erledigt</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void onOpen(task)}
                className="w-full border border-line bg-paper px-4 py-4 text-left active:bg-cream"
              >
                <TaskCopy task={task} index={index} />
                <p className="mt-3 text-sm font-medium text-ink-soft">Noch offen</p>
                <p className="mt-1 text-sm text-wine">Tippen zum Scannen</p>
              </button>
            )}
          </li>
        ))}
      </ol>
      {scan ? (
        <TaskScanner
          taskId={scan.taskId}
          title={scan.title}
          stream={scan.stream}
          onClose={() => {
            setScan((current) => {
              if (current) stopStream(current.stream);
              return null;
            });
          }}
        />
      ) : null}
    </>
  );
}

function TaskCopy({ task, index }: { task: GameTaskView; index: number }) {
  return (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="font-serif text-2xl text-bronze">
          {index + 1}. {task.title}
        </span>
        <span className="shrink-0 text-sm text-olive">{pointsLabel(task.points)}</span>
      </span>
      <span className="mt-2 block whitespace-pre-wrap text-ink-soft">{task.instruction}</span>
    </>
  );
}

function TaskScanner({
  taskId,
  title,
  stream,
  onClose,
}: {
  taskId: number;
  title: string;
  stream: MediaStream;
  onClose: () => void;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastText = useRef<string | null>(null);
  const pending = useRef(false);
  const finished = useRef(false);
  const mounted = useRef(true);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<Claimed | null>(null);

  async function claim(text: string, token: string) {
    try {
      const response = await fetch("/api/spiel/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, taskId }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        status?: "ok" | "already";
        points?: number;
        score?: number;
      } | null;
      if (!mounted.current || finished.current) return;
      if (response.status === 409 || response.status === 404) {
        pending.current = false;
        setSaving(false);
        setError(data?.error ?? (response.status === 409 ? "Das ist der Code einer anderen Aufgabe." : "Diesen Code kennen wir nicht."));
        return;
      }
      if (!response.ok || (data?.status !== "ok" && data?.status !== "already") || data.points === undefined || data.score === undefined) {
        releaseForRetry(text);
        setError(data?.error ?? "Die Punkte konnten nicht gespeichert werden.");
        return;
      }
      finished.current = true;
      controlsRef.current?.stop();
      stopStream(stream);
      setSaving(false);
      setDone({ status: data.status, points: data.points, score: data.score });
      router.refresh();
    } catch {
      if (!mounted.current || finished.current) return;
      releaseForRetry(text);
      setError("Die Verbindung hat nicht geklappt. Bitte noch einmal versuchen.");
    }
  }

  function releaseForRetry(text: string) {
    pending.current = false;
    setSaving(false);
    window.setTimeout(() => {
      if (lastText.current === text) lastText.current = null;
    }, 2000);
  }

  const onCode = useEffectEvent((text: string) => {
    if (finished.current || pending.current || lastText.current === text) return;
    lastText.current = text;
    const token = tokenFromScan(text);
    if (!token) {
      setSaving(false);
      setError("Das ist kein Aufgaben-Code.");
      return;
    }
    pending.current = true;
    setError("");
    setSaving(true);
    void claim(text, token);
  });

  const close = useEffectEvent(() => {
    onClose();
  });

  useEffect(() => {
    mounted.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      mounted.current = false;
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (done) nextRef.current?.focus();
  }, [done]);

  useEffect(() => {
    const video = videoRef.current;
    if (done || !video) return;
    let active = true;
    let controls: { stop: () => void } | null = null;
    video.srcObject = stream;
    video.muted = true;
    void video.play().catch(() => {});

    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const { BrowserQRCodeReader } = await import("@zxing/browser");
          if (!active) return;
          const reader = new BrowserQRCodeReader();
          const next = await reader.decodeFromStream(stream, video, (result) => {
            if (!active || !result) return;
            onCode(result.getText());
          });
          if (!active) {
            next.stop();
            return;
          }
          controls = next;
          controlsRef.current = next;
        } catch {
          if (active && mounted.current) setError("Die Kamera konnte nicht geöffnet werden.");
        }
      })();
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controls?.stop();
      controlsRef.current = null;
    };
  }, [done, stream]);

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241c18] px-4" role="dialog" aria-modal="true" aria-labelledby="scan-done-title">
        <div className="w-full max-w-lg bg-paper px-5 py-6 text-center">
          <p id="scan-done-title" className="font-serif text-3xl text-bronze" role="status">
            {done.status === "already" ? "Die Aufgabe hast du schon." : "Geschafft."}
          </p>
          <p className="mt-3 text-ink-soft">
            {done.status === "already"
              ? "Sie zählt nur einmal."
              : `Das sind ${pointsLabel(done.points)}. Du hast jetzt ${pointsLabel(done.score)}.`}
          </p>
          <button
            ref={nextRef}
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-wine px-4 py-3 text-paper hover:bg-wine-deep"
          >
            Weiter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#241c18]" role="dialog" aria-modal="true" aria-labelledby="scan-title">
      <div className="relative min-h-0 flex-1">
        <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
        <div className="pointer-events-none absolute inset-8 border-2 border-paper/80" />
      </div>
      <div className="bg-paper px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p id="scan-title" className="font-serif text-2xl text-bronze">
          {title}
        </p>
        <p className="mt-2 text-ink-soft">{saving ? "Wird gespeichert…" : "Halte den QR-Code in die Kamera."}</p>
        {error ? (
          <p role="alert" className="mt-3 border border-wine/30 bg-wine/5 px-3 py-2 text-wine">
            {error}
          </p>
        ) : null}
        <button
          ref={cancelRef}
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-line px-4 py-3 text-wine"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function tokenFromScan(text: string) {
  const trimmed = text.trim();
  if (isTaskToken(trimmed)) return trimmed;
  let url: URL;
  try {
    url = trimmed.startsWith("/") ? new URL(trimmed, "https://scan.invalid") : new URL(trimmed);
  } catch {
    return null;
  }
  const match = url.pathname.match(/\/spiel\/einloesen\/([^/]+)\/?$/);
  if (!match?.[1]) return null;
  let token = match[1];
  try {
    token = decodeURIComponent(token);
  } catch {
    return null;
  }
  return isTaskToken(token) ? token : null;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function cameraMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Die Kamera ist blockiert. Erlaube den Zugriff in den Browser-Einstellungen.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
    return "Keine Kamera gefunden.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Die Kamera wird gerade woanders benutzt.";
  }
  if (name === "SecurityError") return "Die Kamera geht nur über eine sichere Verbindung.";
  return "Die Kamera konnte nicht geöffnet werden.";
}
