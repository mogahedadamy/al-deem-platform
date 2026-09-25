"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EnrollButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function enroll() {
    setLoading(true); setError(null);
    const response = await fetch("/api/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId }) }).catch(() => null);
    setLoading(false);
    if (response?.ok) router.refresh();
    else { const body = response ? await response.json().catch(() => ({})) : {}; setError((body as { message?: string }).message ?? "تعذر التسجيل — حاول مجددًا"); }
  }
  return <div className="space-y-2"><button onClick={enroll} disabled={loading} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-secondary px-8 font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60">{loading ? "جارٍ التسجيل..." : "سجّل في الدورة"}</button>{error && <p className="text-center text-sm text-red-700">{error}</p>}</div>;
}

type PaymentDetails = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  referenceHint: string;
};

export function SubmitPaymentForm({ enrollmentId, details }: { enrollmentId: string; details: PaymentDetails }) {
  const router = useRouter();
  const [receipt, setReceipt] = useState<File | null>(null);
  const [bankRef, setBankRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receipt) { setError("اختر صورة الإيصال أو ملف PDF"); return; }
    if (receipt.size > 5 * 1024 * 1024) { setError("حجم الإيصال يجب ألا يتجاوز 5MB"); return; }
    setLoading(true); setError(null);
    const upload = new FormData(); upload.set("receipt", receipt);
    const uploadResponse = await fetch("/api/enroll/receipt", { method: "POST", body: upload }).catch(() => null);
    if (!uploadResponse?.ok) {
      const body = uploadResponse ? await uploadResponse.json().catch(() => ({})) : {};
      setLoading(false); setError((body as { message?: string }).message ?? "تعذر رفع الإيصال"); return;
    }
    const uploaded = (await uploadResponse.json()) as { receiptRef: string };
    const response = await fetch("/api/enroll/payment", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId, receiptUrl: uploaded.receiptRef, bankReference: bankRef }),
    }).catch(() => null);
    setLoading(false);
    if (response?.ok) { setDone(true); router.refresh(); }
    else { const body = response ? await response.json().catch(() => ({})) : {}; setError((body as { message?: string }).message ?? "تعذر إرسال الإيصال"); }
  }

  if (done) return <p className="rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">✓ استلمنا الإيصال — قيد المراجعة من الموظف المالي</p>;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-xl border border-primary/30 bg-primary-light/35 p-4 text-sm text-secondary">
        <p className="font-black">بيانات التحويل البنكي</p>
        <dl className="mt-3 space-y-2 text-xs leading-6 sm:text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted">البنك</dt><dd className="font-bold">{details.bankName}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted">اسم الحساب</dt><dd className="font-bold">{details.accountName}</dd></div>
          <div className="flex items-center justify-between gap-4"><dt className="text-muted">رقم الحساب</dt><dd dir="ltr" className="font-black tracking-wide">{details.accountNumber}</dd></div>
        </dl>
        <p className="mt-3 border-t border-primary/20 pt-3 text-xs leading-6 text-muted">{details.referenceHint}</p>
      </div>
      <label className="block text-sm"><span className="font-medium text-secondary">صورة إيصال التحويل</span><input type="file" accept="image/png,image/jpeg,application/pdf" onChange={(event) => setReceipt(event.target.files?.[0] ?? null)} className="mt-1 block min-h-12 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:ml-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-white" required /><span className="mt-1 block text-xs text-muted">PNG أو JPG أو PDF — بحد أقصى 5MB</span></label>
      <label className="block text-sm"><span className="font-medium text-secondary">رقم مرجع التحويل (اختياري)</span><input dir="ltr" type="text" value={bankRef} onChange={(event) => setBankRef(event.target.value)} placeholder="TRF-..." className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" /></label>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <button type="submit" disabled={loading} className="flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-6 font-semibold text-secondary transition-transform hover:-translate-y-0.5 disabled:opacity-60">{loading ? "جارٍ الرفع والإرسال..." : "ارفع الإيصال للمراجعة"}</button>
    </form>
  );
}
