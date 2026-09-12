// إدارة الاستفسارات (leads) — system_admin فقط.
// الاستفسارات من نموذج "تواصل معنا" في الموقع العام.
import { auth } from "@/auth";
import Link from "next/link";
import { LeadActions } from "./client";

export const metadata = { title: "الاستفسارات" };

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  source: string;
  status: string;
  notes: string;
  createdAt: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export const STATUS_LABEL: Record<string, string> = {
  new: "جديد",
  contacted: "تم التواصل",
  qualified: "مؤهّل",
  converted: "محوّل",
  lost: "مفقود",
};

export const STATUS_STYLE: Record<string, string> = {
  new: "bg-primary/10 text-primary-dark",
  contacted: "bg-amber-50 text-amber-700",
  qualified: "bg-blue-50 text-blue-700",
  converted: "bg-emerald-50 text-emerald-700",
  lost: "bg-surface text-muted",
};

// التحولات المسموحة (state machine خادمي)
export const NEXT_STATUSES: Record<string, { value: string; label: string }[]> =
  {
    new: [
      { value: "contacted", label: "تم التواصل" },
      { value: "qualified", label: "مؤهّل" },
      { value: "lost", label: "مفقود" },
    ],
    contacted: [
      { value: "qualified", label: "مؤهّل" },
      { value: "lost", label: "مفقود" },
    ],
    qualified: [
      { value: "converted", label: "محوّل" },
      { value: "lost", label: "مفقود" },
    ],
  };

export default async function LeadsPage() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-semibold text-secondary">سجّل الدخول أولًا</p>
      </div>
    );
  }

  const res = await fetch(`${API_BASE}/erp/leads?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-semibold text-secondary">
          إدارة الاستفسارات لمدير النظام فقط.
        </p>
      </div>
    );
  }
  const data = (await res.json()) as { items: Lead[]; total: number };

  const counts = data.items.reduce(
    (acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="app-container py-8">
          <nav className="mb-3 text-sm text-muted" aria-label="مسار التنقل">
            <Link href="/" className="hover:text-primary">الرئيسية</Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-secondary">الاستفسارات</span>
          </nav>
          <p className="app-kicker">علاقات العملاء</p>
          <h1 className="app-title">الاستفسارات ({data.total})</h1>
          <p className="app-description">من نموذج «تواصل معنا» — تابعها وحوّلها إلى تسجيلات.</p>
          {data.total > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(counts).map(([st, n]) => (
                <span
                  key={st}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    STATUS_STYLE[st] ?? "border border-border text-muted"
                  }`}
                >
                  {STATUS_LABEL[st] ?? st}: {n}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="app-page flex-1">
        {data.items.length === 0 ? (
          <div className="app-empty">
            <p className="font-semibold text-secondary">لا استفسارات بعد</p>
            <p className="mt-1 text-sm text-muted">
              ستظهر هنا رسائل نموذج «تواصل معنا» فور وصولها.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {data.items.map((l) => (
              <li
                key={l.id}
                className="app-card p-5 sm:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-bold text-secondary">{l.name}</h2>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          STATUS_STYLE[l.status] ?? "border border-border text-muted"
                        }`}
                      >
                        {STATUS_LABEL[l.status] ?? l.status}
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(l.createdAt).toLocaleDateString("ar-EG", {
                          dateStyle: "medium",
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {l.subject} · <span dir="ltr">{l.email}</span>
                      {l.phone && (
                        <>
                          {" · "}
                          <span dir="ltr">{l.phone}</span>
                        </>
                      )}
                    </p>
                    <p className="mt-3 leading-7 text-secondary/90">
                      {l.message}
                    </p>
                    {l.notes && (
                      <p className="mt-3 rounded-lg bg-secondary/[.04] px-3 py-2 text-sm text-muted">
                        ملاحظة الفريق: {l.notes}
                      </p>
                    )}
                  </div>
                  <LeadActions
                    leadId={l.id}
                    options={NEXT_STATUSES[l.status] ?? []}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
