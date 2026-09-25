"use client";

import { useState } from "react";

type Profile = { fullName: string; email: string; phone?: string | null; bio?: string | null };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(null); setError(null);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone, bio }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      const body = response ? await response.json().catch(() => ({})) : {};
      setError((body as { message?: string }).message ?? "تعذر حفظ التغييرات. حاول مرة أخرى.");
      return;
    }
    setMessage("تم حفظ بياناتك بنجاح.");
  }

  return (
    <form onSubmit={save} className="app-card p-5 sm:p-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold text-secondary">الاسم الكامل<input value={fullName} onChange={(event) => setFullName(event.target.value)} minLength={2} maxLength={160} required className="app-input mt-2" /></label>
        <label className="text-sm font-bold text-secondary">البريد الإلكتروني<input value={profile.email} readOnly dir="ltr" className="app-input mt-2 cursor-not-allowed bg-surface-soft text-muted" /><span className="mt-1 block text-xs font-normal text-muted">لتغيير البريد الإلكتروني استخدم بوابة الحساب الآمنة.</span></label>
        <label className="text-sm font-bold text-secondary">رقم الهاتف<input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={50} inputMode="tel" dir="ltr" placeholder="مثال: +249…" className="app-input mt-2" /></label>
        <label className="text-sm font-bold text-secondary sm:col-span-2">نبذة مختصرة (اختياري)<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={1000} rows={4} className="app-input mt-2 py-3" placeholder="يمكنك كتابة نبذة مختصرة عنك أو هدفك التعليمي." /></label>
      </div>
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <button disabled={busy} className="app-button app-button-primary mt-6 min-h-12 disabled:opacity-60">{busy ? "جارٍ الحفظ…" : "حفظ البيانات"}</button>
    </form>
  );
}
