"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = { key: string; label: string };
export function InviteStaff({ roles }: { roles: Role[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState("instructor");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null);
    const response = await fetch("/api/users/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName, email, roleKey }) }).catch(() => null);
    setBusy(false);
    if (!response?.ok) { const body = response ? await response.json().catch(() => ({})) : {}; setError((body as { message?: string }).message ?? "تعذر إرسال الدعوة."); return; }
    setMessage("أُرسلت دعوة تفعيل الحساب بنجاح."); setFullName(""); setEmail(""); setOpen(false); router.refresh();
  }

  return <div>{!open ? <button type="button" onClick={() => setOpen(true)} className="app-button app-button-primary min-h-11">دعوة موظف أو مدرب</button> : <form onSubmit={submit} className="app-card mt-5 grid gap-4 p-5 sm:grid-cols-3"><label className="text-sm font-bold text-secondary">الاسم الكامل<input value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} className="app-input mt-2" /></label><label className="text-sm font-bold text-secondary">البريد الإلكتروني<input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" dir="ltr" className="app-input mt-2" /></label><label className="text-sm font-bold text-secondary">الدور الأول<select value={roleKey} onChange={(event) => setRoleKey(event.target.value)} className="app-input mt-2">{roles.filter((role) => role.key !== "student" && role.key !== "system_admin").map((role) => <option key={role.key} value={role.key}>{role.label}</option>)}</select></label><div className="sm:col-span-3 rounded-xl bg-primary-light/35 p-3 text-xs leading-6 text-secondary">سيصل إلى المدعو رابط آمن لتأكيد البريد وتعيين كلمة المرور. لا تمنحه الدعوة صلاحيات مدير النظام.</div><div className="flex flex-wrap gap-2 sm:col-span-3"><button disabled={busy} className="app-button app-button-primary min-h-11">{busy ? "جارٍ إرسال الدعوة…" : "إرسال الدعوة"}</button><button type="button" onClick={() => setOpen(false)} className="app-button app-button-outline min-h-11">إلغاء</button></div>{error && <p role="alert" className="text-sm text-danger sm:col-span-3">{error}</p>}</form>}{message && <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}</div>;
}
