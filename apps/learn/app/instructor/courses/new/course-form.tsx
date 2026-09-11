"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewCourseForm({ categories }: { categories: { id: string; nameAr: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title") ?? ""), summary: String(form.get("summary") ?? ""),
      description: String(form.get("description") ?? ""), categoryId: String(form.get("categoryId") ?? ""),
      level: String(form.get("level") ?? "beginner"), priceAmount: Number(form.get("priceAmount") ?? 0),
      currency: "SDG", durationHours: Number(form.get("durationHours") ?? 0),
      coverImageUrl: String(form.get("coverImageUrl") ?? "") || null,
      hasLiveSessions: form.get("hasLiveSessions") === "on",
    };
    const response = await fetch("/api/instructor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", payload }) }).catch(() => null);
    setBusy(false);
    if (!response?.ok) { const body = response ? await response.json().catch(() => ({})) : {}; setError((body as { message?: string }).message ?? "تعذر إنشاء الدورة"); return; }
    const course = (await response.json()) as { id: string };
    router.push(`/instructor/courses/${course.id}/edit`);
  }

  const input = "mt-2 min-h-12 w-full rounded-xl border border-border bg-surface px-4 outline-none focus:border-primary";
  return (
    <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-border bg-surface p-5 shadow-sm md:p-8">
      <label className="block text-sm font-bold text-secondary">عنوان الدورة<input name="title" required minLength={4} className={input} /></label>
      <label className="block text-sm font-bold text-secondary">الملخص<textarea name="summary" required rows={2} className={`${input} py-3`} /></label>
      <label className="block text-sm font-bold text-secondary">الوصف التفصيلي<textarea name="description" required rows={5} className={`${input} py-3`} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold text-secondary">الفئة<select name="categoryId" required className={input}><option value="">اختر الفئة</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.nameAr}</option>)}</select></label>
        <label className="block text-sm font-bold text-secondary">المستوى<select name="level" className={input}><option value="beginner">مبتدئ</option><option value="intermediate">متوسط</option><option value="advanced">متقدم</option></select></label>
        <label className="block text-sm font-bold text-secondary">السعر بالجنيه السوداني<input name="priceAmount" type="number" min="0" required className={input} /></label>
        <label className="block text-sm font-bold text-secondary">المدة بالساعات<input name="durationHours" type="number" min="1" required className={input} /></label>
      </div>
      <label className="block text-sm font-bold text-secondary">رابط صورة الغلاف (HTTPS)<input name="coverImageUrl" type="url" dir="ltr" className={input} /></label>
      <label className="flex min-h-11 items-center gap-3 text-sm font-bold text-secondary"><input name="hasLiveSessions" type="checkbox" className="h-5 w-5 accent-[#D4AF37]" /> تتضمن حصصاً مباشرة</label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="min-h-12 w-full rounded-xl bg-secondary px-6 font-bold text-white disabled:opacity-60">{busy ? "جارٍ الإنشاء…" : "إنشاء الدورة والمتابعة"}</button>
    </form>
  );
}
