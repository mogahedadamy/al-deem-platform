"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OperationError } from "../operation-feedback";

type Role = { key: string; label: string };

export function InviteStaff({ roles }: { roles: Role[] }) {
  const router = useRouter();
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState("instructor");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openForm() {
    setOpen(true);
    setMessage(null);
    window.requestAnimationFrame(() => nameInputRef.current?.focus());
  }

  function closeForm() {
    setOpen(false);
    setError(null);
    window.requestAnimationFrame(() => openButtonRef.current?.focus());
  }

  async function sendInvite() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/users/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName, email, roleKey }) });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        setError(body?.message ?? "تعذر إرسال الدعوة.");
        return;
      }
      setMessage("أُرسلت دعوة تفعيل الحساب بنجاح.");
      setFullName("");
      setEmail("");
      setOpen(false);
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخدمة. تحقق من الشبكة ثم أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {!open ? (
        <button ref={openButtonRef} type="button" onClick={openForm} className="app-button app-button-primary min-h-11">دعوة موظف أو مدرب</button>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); void sendInvite(); }} className="app-card mt-5 grid gap-4 p-4 sm:p-5 lg:grid-cols-3">
          <label className="text-sm font-bold text-secondary">الاسم الكامل<input ref={nameInputRef} value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} autoComplete="name" className="app-input mt-2" /></label>
          <label className="text-sm font-bold text-secondary">البريد الإلكتروني<input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" dir="ltr" autoComplete="email" className="app-input mt-2" /></label>
          <label className="text-sm font-bold text-secondary">الدور الأول<select value={roleKey} onChange={(event) => setRoleKey(event.target.value)} className="app-input mt-2">{roles.filter((role) => role.key !== "student" && role.key !== "system_admin").map((role) => <option key={role.key} value={role.key}>{role.label}</option>)}</select></label>
          <div className="rounded-xl bg-primary-light/35 p-3 text-xs leading-6 text-secondary lg:col-span-3">سيصل إلى المدعو رابط آمن لتأكيد البريد وتعيين كلمة المرور. لا تمنحه الدعوة صلاحيات مدير النظام.</div>
          <div className="flex flex-col gap-2 sm:flex-row lg:col-span-3"><button disabled={busy} className="app-button app-button-primary min-h-11">{busy ? "جارٍ إرسال الدعوة…" : "إرسال الدعوة"}</button><button type="button" onClick={closeForm} className="app-button app-button-outline min-h-11">إلغاء</button></div>
          <div className="lg:col-span-3"><OperationError message={error} busy={busy} onRetry={() => void sendInvite()} /></div>
        </form>
      )}
      {message && <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    </div>
  );
}
