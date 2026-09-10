// تفاعلات صفحة الدورة: التسجيل ورفع إيصال الدفع.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

// EnrollButton — يسجل الدورة (idempotent) ثم يعرض رفع الإيصال.
export function EnrollButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    });
    setLoading(false);
    if (res.ok) {
      router.refresh(); // يعرض حالة pending_payment + نموذج الإيصال
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "تعذر التسجيل — حاول مجددًا");
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={enroll}
        disabled={loading}
        className="flex h-12 w-full items-center justify-center rounded-full bg-secondary px-8 font-semibold text-secondary-foreground transition-transform hover:scale-105 disabled:opacity-60"
      >
        {loading ? "جارٍ التسجيل..." : "سجّل في الدورة"}
      </button>
      {error && <p className="text-center text-sm text-red-700">{error}</p>}
    </div>
  );
}

// SubmitPaymentForm — رابط إيصال التحويل البنكي + مرجع البنك.
export function SubmitPaymentForm({ enrollmentId }: { enrollmentId: string }) {
  const router = useRouter();
  const [receiptUrl, setReceiptUrl] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!receiptUrl.trim()) {
      setError("ألصق رابط صورة الإيصال");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/enroll/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId, receiptUrl, bankReference: bankRef }),
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "تعذر إرسال الإيصال — حاول مجددًا");
    }
  }

  if (done) {
    return (
      <p className="rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
        ✓ استلمنا الإيصال — قيد المراجعة من الموظف المالي
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm">
        <span className="font-medium text-secondary">رابط إيصال التحويل</span>
        <input
          dir="ltr"
          type="url"
          value={receiptUrl}
          onChange={(e) => setReceiptUrl(e.target.value)}
          placeholder="https://..."
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-secondary">رقم مرجع التحويل (اختياري)</span>
        <input
          dir="ltr"
          type="text"
          value={bankRef}
          onChange={(e) => setBankRef(e.target.value)}
          placeholder="TRF-..."
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="flex h-11 w-full items-center justify-center rounded-full bg-primary px-6 font-semibold text-secondary transition-transform hover:scale-105 disabled:opacity-60"
      >
        {loading ? "جارٍ الإرسال..." : "أرسل الإيصال للمراجعة"}
      </button>
    </form>
  );
}
