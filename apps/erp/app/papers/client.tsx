// زر تقديم حالة الطلب الورقي.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OperationError } from "../operation-feedback";

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
    if (!window.confirm(`تأكيد الإجراء: ${nextLabel}؟`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/papers/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: nextStatus }),
      });
      if (res.ok) router.refresh();
      else {
        const body = await res.json().catch(() => null) as { message?: string } | null;
        setError(body?.message ?? "تعذر تحديث حالة الطلب.");
      }
    } catch {
      setError("تعذر الاتصال بالخدمة. تحقق من الشبكة ثم أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={advance}
        disabled={busy}
      className="app-button app-button-primary min-h-11 w-full sm:w-auto"
      >
        {busy ? "…" : nextLabel}
      </button>
      <OperationError message={error} busy={busy} onRetry={() => void advance()} />
    </div>
  );
}
