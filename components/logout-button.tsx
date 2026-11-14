"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/admin/logout", { method: "POST" });
        router.refresh();
        setPending(false);
      }}
      className="border border-wine px-4 py-2 text-sm text-wine hover:bg-wine hover:text-paper disabled:opacity-60"
    >
      {pending ? "Wird abgemeldet…" : "Abmelden"}
    </button>
  );
}
