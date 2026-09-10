// أزرار الاعتماد/الرفض للموظف المالي — عبر server proxy route.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewActions({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/finance/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      const b = await res.json().catch(() => null);
      setError(b?.message ?? "تعذر الاعتماد");
    }
  }

  async function reject(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("سبب الرفض مطلوب — يصل للطالب");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/finance/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, reason }),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      const b = await res.json().catch(() => null);
      setError(b?.message ?? "تعذر الرفض");
    }
  }

  return (
    <div className="w-full max-w-sm space-y-2">
      {rejecting ? (
        <form onSubmit={reject} className="space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="سبب الرفض (يصل للطالب) — مطلوب"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              رفض نهائي
            </button>
            <button
              type="button"
              onClick={() => {
                setRejecting(false);
                setReason("");
                setError(null);
              }}
              className="rounded-full border border-border px-4 py-2 text-sm"
            >
              إلغاء
            </button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={approve}
            disabled={busy}
            className="flex-1 rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            اعتماد وتفعيل التسجيل
          </button>
          <button
            onClick={() => setRejecting(true)}
            disabled={busy}
            className="rounded-full border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            رفض
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
