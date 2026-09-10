// التقارير — أرقام حية للإدارة من /erp/stats.
import { auth } from "@/auth";
import Link from "next/link";

export const metadata = { title: "التقارير" };

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

const STATUS_AR: Record<string, string> = {
  active: "نشطة",
  completed: "مكتملة",
  pending_payment: "بانتظار الدفع",
  cancelled: "ملغاة",
  published: "منشورة",
  draft: "مسودة",
  pending_review: "بانتظار المراجعة",
  rejected: "مرفوضة",
  archived: "مؤرشفة",
  pending: "قيد المعالجة",
  approved: "معتمدة",
  printed: "مطبوعة",
  delivered: "مُسلّمة",
  new: "جديد",
  contacted: "تم التواصل",
  qualified: "مؤهّل",
  converted: "محوّل",
  lost: "مفقود",
};

const ar = (s: string) => STATUS_AR[s] ?? s;

type Stats = {
  enrollments: Record<string, number>;
  paymentsApprovedCount: number;
  paymentsApprovedSum: number;
  paymentsPendingCount: number;
  certificatesIssued: number;
  paperRequests: Record<string, number>;
  courses: Record<string, number>;
  // MVP R4-B
  leads: Record<string, number>;
  completionRate: number;
  quiz: { attempts: number; passed: number; avgScore?: number };
  liveSessions: { upcoming: number; attendance: number };
  courseSummary: { course: string; instructor: string; students: number }[];
};

export default async function ReportsPage() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;

  if (!token) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-semibold text-secondary">سجّل الدخول أولًا</p>
      </div>
    );
  }

  const res = await fetch(`${API_BASE}/erp/stats`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-semibold text-secondary">
          التقارير للفريق الإداري فقط.
        </p>
      </div>
    );
  }
  const s = (await res.json()) as Stats;

  const enrollTotal = Object.values(s.enrollments).reduce((a, b) => a + b, 0);
  const courseTotal = Object.values(s.courses).reduce((a, b) => a + b, 0);
  const paperTotal = Object.values(s.paperRequests).reduce((a, b) => a + b, 0);

  const leadsTotal = Object.values(s.leads).reduce((a, b) => a + b, 0);
  const cards = [
    { label: "الدورات المنشورة", value: `${s.courses.published ?? 0}`, hint: `من أصل ${courseTotal}` },
    { label: "التسجيلات", value: `${enrollTotal}`, hint: Object.entries(s.enrollments).map(([k, v]) => `${ar(k)} ${v}`).join(" · ") },
    { label: "إيراد معتمد", value: `${Math.round(s.paymentsApprovedSum).toLocaleString("ar-EG")} ج.س`, hint: `${s.paymentsApprovedCount} دفعة معتمدة` },
    { label: "شهادات صادرة", value: `${s.certificatesIssued}`, hint: `${paperTotal} طلب نسخة ورقية` },
    { label: "نسبة الإكمال", value: `${s.completionRate}%`, hint: "من التسجيلات المدفوعة (نشطة + مكتملة)" },
    { label: "نتائج الاختبارات", value: `${s.quiz.avgScore ? Math.round(s.quiz.avgScore) : 0}%`, hint: `${s.quiz.passed} ناجح من ${s.quiz.attempts} محاولة` },
    { label: "الاستفسارات", value: `${leadsTotal}`, hint: Object.entries(s.leads).map(([k, v]) => `${ar(k)} ${v}`).join(" · ") },
    { label: "حصص مباشرة", value: `${s.liveSessions.upcoming}`, hint: `${s.liveSessions.attendance} حضور مسجّل — قادمة` },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <nav className="mb-2 text-sm text-muted">
            <Link href="/" className="hover:text-primary">
              الرئيسية
            </Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-secondary">التقارير</span>
          </nav>
          <h1 className="text-2xl font-black text-secondary">التقارير</h1>
          <p className="mt-1 text-sm text-muted">
            نظرة حية على أداء المركز — أرقام مباشرة من قاعدة البيانات.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <p className="text-sm text-muted">{c.label}</p>
              <p className="mt-2 text-3xl font-black text-secondary">
                {c.value}
              </p>
              {c.hint && <p className="mt-1 text-xs text-muted">{c.hint}</p>}
            </div>
          ))}
        </div>

        {/* ملخص دورات المدرب — MVP تقارير */}
        <div className="mt-8 rounded-xl border border-border bg-surface p-5">
          <h2 className="font-bold text-secondary">ملخص الدورات والمدربين</h2>
          <p className="mt-1 text-xs text-muted">
            عدد الطلاب المسجّلين (نشط/مكتمل) لكل دورة منشورة.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-right text-muted">
                  <th className="py-2 pl-3 font-semibold">الدورة</th>
                  <th className="py-2 pl-3 font-semibold">المدرب</th>
                  <th className="py-2 pl-3 font-semibold">الطلاب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {s.courseSummary.map((r) => (
                  <tr key={r.course}>
                    <td className="py-2.5 pl-3 font-medium text-secondary">{r.course}</td>
                    <td className="py-2.5 pl-3 text-muted">{r.instructor}</td>
                    <td className="py-2.5 pl-3 font-bold text-secondary">{r.students}</td>
                  </tr>
                ))}
                {s.courseSummary.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-muted">
                      لا دورات منشورة بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* تفصيل الدفعات والطلبات الورقية */}
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-bold text-secondary">النسخ الورقية</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {Object.entries(s.paperRequests).map(([st, n]) => (
                <div key={st} className="flex justify-between">
                  <dt className="text-muted">{ar(st)}</dt>
                  <dd className="font-bold text-secondary">{n}</dd>
                </div>
              ))}
              {paperTotal === 0 && <p className="text-muted">لا طلبات بعد</p>}
            </dl>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-bold text-secondary">الدفعات</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">معتمدة</dt>
                <dd className="font-bold text-secondary">
                  {s.paymentsApprovedCount}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">بانتظار المراجعة</dt>
                <dd className="font-bold text-secondary">
                  {s.paymentsPendingCount}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
