// صفحة التحقق من الشهادة — عامة، من أهم صفحات المركز (ثقة الجهات).
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "التحقق من الشهادات",
  description: "تحقق من صحة شهادة صادرة من مركز الديم للتدريب برقمها التسلسلي.",
};

type Params = Promise<{ serial: string }>;
type SearchParams = Promise<{ serial?: string }>;

const API_PUB = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

type CertInfo = {
  serialNumber: string;
  studentName: string;
  courseTitle: string;
  finalScore: number;
  issuedAt: string;
  valid: boolean;
};

async function verify(serial: string): Promise<CertInfo | null> {
  const res = await fetch(
    `${API_PUB}/public/certificates/${encodeURIComponent(serial)}`,
    { next: { revalidate: 300 } },
  );
  if (!res.ok) return null;
  return res.json() as Promise<CertInfo>;
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const serial = (sp.serial ?? "").trim();
  let result: CertInfo | null = null;
  let searched = false;

  if (serial) {
    searched = true;
    result = await verify(serial);
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <nav className="mb-3 text-sm text-muted" aria-label="مسار التنقل">
            <Link href="/" className="hover:text-primary">
              الرئيسية
            </Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-secondary">التحقق من الشهادات</span>
          </nav>
          <h1 className="text-3xl font-black text-secondary">التحقق من الشهادات</h1>
          <p className="mt-2 leading-7 text-muted">
            أدخل الرقم التسلسلي المدوّن على الشهادة للتأكد من صدرتها عن مركز
            الديم للتدريب.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {/* نموذج البحث — GET قابل للمشاركة والمشاركة كرابط */}
        <form method="GET" className="flex gap-3" role="search">
          <input
            type="text"
            name="serial"
            defaultValue={serial}
            dir="ltr"
            placeholder="ALD-2026-xxxxxxxx"
            className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 font-mono text-sm focus:border-primary focus:outline-none"
            aria-label="الرقم التسلسلي للشهادة"
          />
          <button
            type="submit"
            className="rounded-lg bg-secondary px-8 py-3 font-semibold text-secondary-foreground hover:opacity-90"
          >
            تحقّق
          </button>
        </form>

        {/* النتيجة */}
        {searched &&
          (result ? (
            <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6" dir="rtl">
              <p className="flex items-center gap-2 text-lg font-black text-emerald-800">
                <span aria-hidden>✓</span> شهادة صحيحة ومعتمدة
              </p>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-emerald-700">الاسم</dt>
                  <dd className="mt-1 font-bold text-emerald-900">{result.studentName}</dd>
                </div>
                <div>
                  <dt className="text-sm text-emerald-700">الدورة</dt>
                  <dd className="mt-1 font-bold text-emerald-900">{result.courseTitle}</dd>
                </div>
                <div>
                  <dt className="text-sm text-emerald-700">النتيجة</dt>
                  <dd className="mt-1 font-bold text-emerald-900">{result.finalScore}%</dd>
                </div>
                <div>
                  <dt className="text-sm text-emerald-700">تاريخ الإصدار</dt>
                  <dd className="mt-1 font-bold text-emerald-900">
                    {new Date(result.issuedAt).toLocaleDateString("ar-EG", { dateStyle: "long" })}
                  </dd>
                </div>
              </dl>
              <p className="mt-5 border-t border-emerald-200 pt-4 text-xs text-emerald-700">
                الرقم التسلسلي: <span dir="ltr" className="font-mono">{result.serialNumber}</span>
              </p>
            </div>
          ) : (
            <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6" role="alert">
              <p className="font-bold text-red-800">
                لا توجد شهادة بهذا الرقم
              </p>
              <p className="mt-1 text-sm text-red-700">
                تأكد من كتابة الرقم التسلسلي كما هو مدوّن على الشهادة (يبدأ
                بـALD-).
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}
