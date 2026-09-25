"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Session = { id: string; status: string };
const transitions: Record<string, { status: string; label: string }[]> = {
  scheduled: [{ status: "join_open", label: "فتح الانضمام" }, { status: "cancelled", label: "إلغاء الحصة" }],
  join_open: [{ status: "live", label: "بدء الحصة" }, { status: "cancelled", label: "إلغاء الحصة" }],
  live: [{ status: "ended", label: "إنهاء الحصة" }],
};

export function SessionActions({ session }: { session: Session }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const available = transitions[session.status] ?? [];
  if (available.length === 0) return null;

  async function advance(status: string) {
    if (status === "cancelled" && !window.confirm("هل تريد إلغاء الحصة؟ سيظهر القرار للطلاب.")) return;
    setBusy(true); setError(null);
    const response = await fetch("/api/instructor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "advanceSession", sessionId: session.id, payload: { status } }) }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      const body = response ? await response.json().catch(() => ({})) : {};
      setError((body as { message?: string }).message ?? "تعذر تحديث حالة الحصة.");
      return;
    }
    router.refresh();
  }

  return <div className="mt-4 flex flex-wrap gap-2">{available.map((item) => <button key={item.status} onClick={() => void advance(item.status)} disabled={busy} className={item.status === "cancelled" ? "app-button min-h-10 border border-red-200 text-xs text-danger" : "app-button app-button-primary min-h-10 text-xs"}>{busy ? "جارٍ التحديث…" : item.label}</button>)}{error && <p role="alert" className="w-full text-xs text-danger">{error}</p>}</div>;
}
