"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SAVE_THE_DATE_KEY } from "@/lib/legal";

const LABEL = "Save the Date. Helen und Oliver, 23. Oktober 2027, Borghorst. Bitte haltet euch den Tag frei. Einladung folgt.";

export function SaveTheDate() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const onAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  useEffect(() => {
    if (onAdmin) {
      setOpen(false);
      return;
    }
    if (sessionStorage.getItem(SAVE_THE_DATE_KEY) === "1") return;
    setOpen(true);
  }, [onAdmin]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLButtonElement>("[data-close]")?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      if (dialog.open) dialog.close();
    };
  }, [open]);

  function dismiss() {
    sessionStorage.setItem(SAVE_THE_DATE_KEY, "1");
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    setOpen(false);
  }

  if (onAdmin || !open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-label={LABEL}
      className="save-the-date"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="relative">
        <img
          src="/save-the-date.jpg"
          alt=""
          width={819}
          height={1024}
          className="block max-h-[calc(100dvh-2.5rem)] w-auto max-w-[calc(100vw-2.5rem)] shadow-[0_24px_60px_-28px_rgba(36,28,24,0.7)]"
        />
        <button
          type="button"
          data-close
          onClick={dismiss}
          aria-label="Schließen"
          className="absolute top-2 right-2 flex size-10 items-center justify-center rounded-full bg-paper/95 text-2xl leading-none text-ink shadow-sm hover:bg-paper"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </dialog>
  );
}
