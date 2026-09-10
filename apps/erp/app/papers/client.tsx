// زر تقديم حالة الطلب الورقي.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PaperAdvance({
  requestId,
  nextStatus,
  nextLabel,
}: {
  requestId: string;
  nextStatus: string;
  nextLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function advance() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/papers/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, status: nextStatus }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError("تعذر التحديث");
  }

  return (
    <div>
      <button
        onClick={advance}
        disabled={busy}
        className="rounded-full bg-secondary px-6 py-2.5 text-sm font-semibold text-secondary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "…" : nextLabel}
      </button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
