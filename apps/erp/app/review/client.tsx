"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OperationError } from "../operation-feedback";

type RetryAction = "publish" | "reject";

export function ReviewActions({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<RetryAction>("publish");

  async function send(action: RetryAction) {
    if (action === "publish" && !window.confirm("نشر الدورة سيجعلها متاحة للجمهور فورًا. هل أنت متأكد؟")) return;
    if (action === "reject" && !notes.trim()) {
      setRetryAction("reject");
      setError("ملاحظات الرفض مطلوبة — تصل للمدرب");
      return;
    }
    setBusy(true);
    setError(null);
    setRetryAction(action);
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "publish" ? { courseId } : { courseId, notes }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        setError(body?.message ?? (action === "publish" ? "تعذر نشر الدورة." : "تعذر رفض الدورة."));
        return;
      }
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخدمة. تحقق من الشبكة ثم أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-2">
      {rejecting ? (
        <form onSubmit={(event) => { event.preventDefault(); void send("reject"); }} className="space-y-2">
          <label htmlFor={`review-notes-${courseId}`} className="block text-sm font-bold text-secondary">ملاحظات الرفض</label>
          <textarea id={`review-notes-${courseId}`} value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} required className="app-input min-h-24 text-sm" />
          <p className="text-xs text-muted">مطلوبة، وستظهر للمدرب.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={busy} className="app-button min-h-11 flex-1 bg-red-700 text-white hover:opacity-90 disabled:opacity-60">{busy ? "جارٍ الرفض…" : "رفض وإعادة للمدرب"}</button>
            <button type="button" onClick={() => { setRejecting(false); setError(null); }} className="app-button app-button-outline min-h-11">إلغاء</button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => void send("publish")} disabled={busy} className="app-button min-h-11 flex-1 bg-emerald-700 text-white hover:opacity-90 disabled:opacity-60">{busy ? "جارٍ النشر…" : "نشر الدورة"}</button>
          <button type="button" onClick={() => setRejecting(true)} disabled={busy} className="app-button min-h-11 border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-60">رفض</button>
        </div>
      )}
      <OperationError message={error} busy={busy} onRetry={() => void send(retryAction)} />
    </div>
  );
}
