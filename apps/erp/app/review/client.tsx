// نشر/رفض دورة — عبر proxy.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewActions({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/review/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError("تعذر النشر");
  }

  async function reject(e: React.FormEvent) {
    e.preventDefault();
    if (!notes.trim()) {
      setError("ملاحظات الرفض مطلوبة — تصل للمدرب");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/review/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, notes }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError("تعذر الرفض");
  }

  return (
    <div className="w-full max-w-sm space-y-2">
      {rejecting ? (
        <form onSubmit={reject} className="space-y-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="ملاحظات للمدرب (مطلوبة)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              رفض وإعادة للمدرب
            </button>
            <button
              type="button"
              onClick={() => {
                setRejecting(false);
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
            onClick={publish}
            disabled={busy}
            className="flex-1 rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            نشر الدورة
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
