"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OperationError } from "../operation-feedback";

type RetryAction = "approve" | "reject";

export function ReviewActions({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<RetryAction>("approve");

  async function send(action: RetryAction) {
    if (action === "approve" && !window.confirm("سيتم اعتماد الدفعة وتفعيل تسجيل الطالب فورًا. هل أنت متأكد؟")) return;
    if (action === "reject" && !reason.trim()) {
      setRetryAction("reject");
      setError("سبب الرفض مطلوب — يصل للطالب");
      return;
    }
    setBusy(true);
    setError(null);
    setRetryAction(action);
    try {
      const response = await fetch(action === "approve" ? "/api/finance/approve" : "/api/finance/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "approve" ? { paymentId } : { paymentId, reason }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        setError(body?.message ?? (action === "approve" ? "تعذر اعتماد الدفعة." : "تعذر رفض الدفعة."));
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
          <label htmlFor={`payment-reason-${paymentId}`} className="block text-sm font-bold text-secondary">سبب الرفض</label>
          <textarea id={`payment-reason-${paymentId}`} value={reason} onChange={(event) => setReason(event.target.value)} rows={3} required className="app-input min-h-24 text-sm" />
          <p className="text-xs text-muted">مطلوب، وسيصل إلى الطالب.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={busy} className="app-button min-h-11 flex-1 bg-red-700 text-white hover:opacity-90 disabled:opacity-60">{busy ? "جارٍ الرفض…" : "رفض نهائي"}</button>
            <button type="button" onClick={() => { setRejecting(false); setReason(""); setError(null); }} className="app-button app-button-outline min-h-11">إلغاء</button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => void send("approve")} disabled={busy} className="app-button min-h-11 flex-1 bg-emerald-700 text-white hover:opacity-90 disabled:opacity-60">{busy ? "جارٍ الاعتماد…" : "اعتماد وتفعيل التسجيل"}</button>
          <button type="button" onClick={() => setRejecting(true)} disabled={busy} className="app-button min-h-11 border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-60">رفض</button>
        </div>
      )}
      <OperationError message={error} busy={busy} onRetry={() => void send(retryAction)} />
    </div>
  );
}
