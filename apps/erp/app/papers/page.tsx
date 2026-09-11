// النسخ الورقية — قائمة انتظار الطلبات وتقديم الحالات.
import { auth } from "@/auth";
import Link from "next/link";
import { PaperAdvance } from "./client";

export const metadata = { title: "النسخ الورقية" };

type PaperRequest = {
  id: string;
  certificateId: string;
  status: string;
  deliveryAddress: string;
  deliveryPhone: string;
  createdAt: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

const NEXT_STATUS: Record<string, string> = {
  pending: "approved",
  approved: "printed",
  printed: "delivered",
};

const NEXT_LABEL: Record<string, string> = {
  approved: "اعتماد الطلب",
  printed: "تمت الطباعة",
  delivered: "تم التسليم",
};

export default async function PapersPage() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;

  if (!token) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-semibold text-secondary">سجّل الدخول أولًا</p>
      </div>
    );
  }

  // كل الحالات — نجلب pending وapproved وprinted
  const statuses = ["pending", "approved", "printed"];
  const groups = await Promise.all(
    statuses.map(async (st) => {
      const res = await fetch(
        `${API_BASE}/erp/paper-requests?status=${st}&pageSize=50`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );
      if (!res.ok) return { st, items: [] as PaperRequest[], total: 0, status: res.status };
      const d = (await res.json()) as { items: PaperRequest[]; total: number };
      return { st, items: d.items, total: d.total, status: res.status };
    }),
  );

  const failed = groups.find((group) => group.status >= 400);
  if (failed) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-black text-secondary">تعذر تحميل طلبات الشهادات</h1>
        <p className="mt-3 text-muted">{failed.status === 403 ? "لا تملك صلاحية إدارة الطلبات الورقية." : "حدث خطأ في الاتصال بالخدمة. حاول لاحقًا."}</p>
        <Link href="/" className="mt-6 inline-block font-bold text-primary-dark">العودة للرئيسية</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <nav className="mb-2 text-sm text-muted">
            <Link href="/" className="hover:text-primary">
              الرئيسية
            </Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-secondary">النسخ الورقية</span>
          </nav>
          <h1 className="text-2xl font-black text-secondary">
            طلبات الشهادات الورقية
          </h1>
          <p className="mt-1 text-sm text-muted">
            دورة حياة الطلب: قيد المعالجة → معتمدة → مطبوعة → مُسلّمة.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {groups.every((g) => g.items.length === 0) ? (
          <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
            <p className="font-semibold text-secondary">لا طلبات حاليًا ✓</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map(
              (g) =>
                g.items.length > 0 && (
                  <section key={g.st}>
                    <h2 className="mb-3 font-bold text-secondary">
                      {g.st === "pending"
                        ? "قيد المعالجة"
                        : g.st === "approved"
                          ? "معتمدة"
                          : "مطبوعة"}{" "}
                      ({g.total})
                    </h2>
                    <ul className="space-y-3">
                      {g.items.map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div>
                            <p className="font-medium text-secondary" dir="rtl">
                              {p.deliveryAddress}
                            </p>
                            <p className="mt-1 text-xs text-muted" dir="ltr">
                              {p.deliveryPhone}
                            </p>
                          </div>
                          <PaperAdvance
                            requestId={p.id}
                            nextStatus={NEXT_STATUS[p.status]}
                            nextLabel={NEXT_LABEL[p.status] ?? "تقديم"}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
