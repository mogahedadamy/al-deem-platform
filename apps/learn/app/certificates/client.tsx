// طلب النسخة الورقية — عبر proxy.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RequestPaperForm({ certificateId }: { certificateId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim() || !phone.trim()) {
      setError("العنوان والهاتف مطلوبان");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/certificates/paper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        certificateId,
        deliveryAddress: address,
        deliveryPhone: phone,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setOpen(false);
      router.refresh();
    } else {
      const b = await res.json().catch(() => null);
      setError(b?.message ?? "تعذر إرسال الطلب");
    }
  }

  if (done) {
    return (
      <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        ✓ طُلبت النسخة الورقية — سيتم تسليمها للعنوان المحدد.
      </p>
    );
  }

  return (
    <div className="mt-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-sm font-semibold text-secondary underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
        >
          اطلب نسخة ورقية رسمية
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-2 border-t border-border pt-3">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="عنوان التسليم الكامل"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <input
            type="tel"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+2499xxxxxxxx"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-secondary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "جارٍ الإرسال..." : "إرسال الطلب"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-border px-5 py-2 text-sm"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
