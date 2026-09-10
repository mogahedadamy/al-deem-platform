// نموذج استفسار (client) — يسجّل Lead في core-api عبر /api/contact.
"use client";

import { useState } from "react";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError(null);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => null);
    setBusy(false);
    if (res && res.ok) {
      setSent(true);
      form.reset();
    } else {
      const d = res ? await res.json().catch(() => ({})) : {};
      setError((d as { message?: string }).message ?? "تعذر الإرسال — حاول لاحقًا");
    }
  }

  if (sent) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center"
      >
        <p className="text-2xl font-black text-emerald-700">✓ تم استلام استفسارك</p>
        <p className="mt-2 text-sm leading-7 text-emerald-900">
          شكرًا لتواصلك — سنرد على بريدك خلال يوم عمل واحد.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-6 rounded-full border border-emerald-600 px-6 py-2 text-sm font-semibold text-emerald-700"
        >
          إرسال استفسار آخر
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-surface p-6 md:p-8"
      aria-labelledby="form-title"
    >
      <h2 id="form-title" className="text-lg font-black text-secondary">
        أرسل استفسارك
      </h2>
      <p className="mt-1 text-sm text-muted">نرد عادة خلال يوم عمل واحد.</p>

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-secondary">
            الاسم الكامل
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={200}
            autoComplete="name"
            className="h-12 w-full rounded-xl border border-border bg-background px-4 text-secondary outline-none focus:border-primary"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-secondary">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            dir="ltr"
            className="h-12 w-full rounded-xl border border-border bg-background px-4 text-secondary outline-none focus:border-primary"
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-medium text-secondary">
            رقم الهاتف (اختياري)
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            dir="ltr"
            className="h-12 w-full rounded-xl border border-border bg-background px-4 text-secondary outline-none focus:border-primary"
          />
        </div>
        <div>
          <label htmlFor="subject" className="mb-2 block text-sm font-medium text-secondary">
            موضوع الاستفسار
          </label>
          <select
            id="subject"
            name="subject"
            className="h-12 w-full rounded-xl border border-border bg-background px-4 text-secondary outline-none focus:border-primary"
          >
            <option>التسجيل في دورة</option>
            <option>محتوى الدورات والشهادات</option>
            <option>التدريب المؤسسي</option>
            <option>استفسار عام</option>
          </select>
        </div>
        <div>
          <label htmlFor="message" className="mb-2 block text-sm font-medium text-secondary">
            رسالتك
          </label>
          <textarea
            id="message"
            name="message"
            required
            maxLength={4000}
            rows={5}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-secondary outline-none focus:border-primary"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-8 h-12 w-full rounded-full bg-secondary font-semibold text-secondary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60"
      >
        {busy ? "جارٍ الإرسال…" : "إرسال الاستفسار"}
      </button>
    </form>
  );
}
