// شهاداتي — الطالب يرى شهاداته الرقمية ويطلب النسخة الورقية.
import { auth } from "@/auth";
import Link from "next/link";
import { RequestPaperForm } from "./client";

export const metadata = { title: "شهاداتي" };

import type { Certificate } from "@al-deem/api-client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export default async function CertificatesPage() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;

  if (!token) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-semibold text-secondary">سجّل الدخول أولًا</p>
        <Link href="/login" className="mt-4 inline-block text-primary-dark">
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  const res = await fetch(`${API_BASE}/me/certificates`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = res.ok
    ? ((await res.json()) as { items: Certificate[] })
    : { items: [] };

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <nav className="mb-2 text-sm text-muted">
            <Link href="/dashboard" className="hover:text-primary">
              لوحة التحكم
            </Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-secondary">شهاداتي</span>
          </nav>
          <h1 className="text-2xl font-black text-secondary">شهاداتي</h1>
          <p className="mt-1 text-sm text-muted">
            الشهادات الرقمية تصدر تلقائيًا عند اجتياز اختبار الدورة بنسبة 70%
            فأكثر — ويمكن طلب نسخة ورقية رسمية.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {data.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
            <p className="font-semibold text-secondary">لا شهادات بعد</p>
            <p className="mt-1 text-sm text-muted">
              أكمل دورة واجتز اختبارها النهائي لتصدر شهادتك تلقائيًا.
            </p>
          </div>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">
            {data.items.filter((c) => c.id).map((c) => (
              <li
                key={c.id}
                className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface"
              >
                {/* رأس الشهادة */}
                <div className="flex items-center justify-between border-b border-border bg-secondary px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 font-black text-primary">
                      دي
                    </span>
                    <div>
                      <p className="text-sm font-bold text-secondary-foreground">
                        مركز الديم للتدريب
                      </p>
                      <p className="text-xs text-secondary-foreground/70">
                        شهادة إتمام معتمدة
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-secondary">
                    {c.finalScore}%
                  </span>
                </div>
                <div className="flex-1 p-5">
                  <h3 className="text-lg font-bold leading-8 text-secondary">
                    {c.courseTitle}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    صدرت في{" "}
                    {new Date(c.issuedAt ?? "").toLocaleDateString("ar-EG", {
                      dateStyle: "long",
                    })}
                  </p>
                  <p className="mt-3 text-xs text-muted">
                    الرقم التسلسلي:{" "}
                    <span dir="ltr" className="font-mono text-secondary">
                      {c.serialNumber}
                    </span>
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <a
                      href={`https://www.alameedtraining.com/verify?serial=${c.serialNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-primary-dark hover:text-primary"
                    >
                      صفحة التحقق ↗
                    </a>
                  </div>
                  <RequestPaperForm certificateId={c.id!} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
