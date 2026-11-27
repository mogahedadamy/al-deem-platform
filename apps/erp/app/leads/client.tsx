// إجراءات الاستفسار — تقدم الحالة + ملاحظة (client component).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OperationError } from "../operation-feedback";

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
  const [retryStatus, setRetryStatus] = useState<string | null>(null);

  async function advance(status: string, confirmed = false) {
    if (!confirmed && (status === "lost" || status === "converted")) {
      setPendingStatus(status);
      setShowNote(true);
      return;
    }
    setBusy(true);
    setError(null);
    setRetryStatus(status);
    try {
      const res = await fetch(`/api/leads/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, status, notes: note }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { message?: string };
        setError(d.message ?? "تعذر تحديث الاستفسار.");
        return;
      }
      setShowNote(false);
      setNote("");
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخدمة. تحقق من الشبكة ثم أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  }

  if (options.length === 0) return null;

  return (
    <div className="shrink-0 sm:w-56">
      {showNote ? (
        <div className="space-y-2">
          <label htmlFor={`lead-note-${leadId}`} className="block text-sm font-bold text-secondary">ملاحظة الإغلاق أو التحويل</label>
          <textarea
            id={`lead-note-${leadId}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="سبب الإغلاق / ملاحظة التحويل…"
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={() => pendingStatus && void advance(pendingStatus, true)}
              disabled={busy || !note}
              className="app-button app-button-primary min-h-11 flex-1 text-xs disabled:opacity-60"
            >
              {busy ? "…" : "تأكيد"}
            </button>
            <button
              onClick={() => setShowNote(false)}
              className="app-button app-button-outline min-h-11 text-xs"
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
              onClick={() => void advance(o.value)}
              disabled={busy}
              className={`min-h-11 rounded-xl px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
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
      <OperationError message={error} busy={busy} onRetry={() => retryStatus && void advance(retryStatus, true)} />
    </div>
  );
}
