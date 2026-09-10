// إجراءات الاستفسار — تقدم الحالة + ملاحظة (client component).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = { value: string; label: string };

export function LeadActions({
  leadId,
  options,
}: {
  leadId: string;
  options: Option[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function advance(status: string) {
    if (status === "lost" || status === "converted") {
      setPendingStatus(status);
      setShowNote(true);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/leads/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, status, notes: note }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.message ?? "تعذر تحديث الاستفسار");
      return;
    }
    setShowNote(false);
    setNote("");
    router.refresh();
  }

  if (options.length === 0) return null;

  return (
    <div className="shrink-0 sm:w-56">
      {showNote ? (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="سبب الإغلاق / ملاحظة التحويل…"
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={() => pendingStatus && advance(pendingStatus)}
              disabled={busy || !note}
              className="flex-1 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
            >
              {busy ? "…" : "تأكيد"}
            </button>
            <button
              onClick={() => setShowNote(false)}
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted"
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => advance(o.value)}
              disabled={busy}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                o.value === "lost"
                  ? "border border-border text-muted hover:bg-surface"
                  : o.value === "converted"
                    ? "bg-emerald-600 text-white hover:opacity-90"
                    : "bg-secondary text-secondary-foreground hover:opacity-90"
              }`}
            >
              {busy ? "…" : `→ ${o.label}`}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
