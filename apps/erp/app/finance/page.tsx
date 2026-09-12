// قائمة انتظار مراجعة الدفعات — للموظف المالي المخصص (قرار #6).
import { auth } from "@/auth";
import Link from "next/link";
import { ReviewActions } from "./client";

export const metadata = { title: "مراجعة الدفعات" };

type Payment = {
  id: string;
  enrollmentId: string;
  studentId: string;
  method: string;
  amount: number;
  currency: string;
  status: string;
  receiptUrl: string;
  bankReference: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

function receiptHref(reference: string) {
  return reference.startsWith("receipt://")
    ? `/api/finance/receipts/${encodeURIComponent(reference.slice("receipt://".length))}`
    : reference;
}

async function fetchPayments(token: string) {
  const res = await fetch(`${API_BASE}/finance/payments?pageSize=50`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ items: Payment[]; total: number }>;
}

export default async function FinancePage() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-semibold text-secondary">سجّل الدخول أولًا</p>
      </div>
    );
  }
  const data = await fetchPayments(token);
  if (data === null) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-semibold text-secondary">
          لا تملك صلاحية مراجعة الدفعات — لحساب الموظف المالي فقط.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="app-container py-8">
          <nav className="mb-3 text-sm text-muted" aria-label="مسار التنقل">
            <Link href="/" className="hover:text-primary">الرئيسية</Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-secondary">مراجعة الدفعات</span>
          </nav>
          <p className="app-kicker">المالية</p>
          <h1 className="app-title">طلبات الدفع بانتظار المراجعة</h1>
          <p className="app-description">تحويل بنكي — اعتمد الإيصال فيُفعَّل التسجيل فورًا وذريًا. قراراتك تُسجَّل في سجل التدقيق.</p>
        </div>
      </header>

      <div className="app-page flex-1">
        {data.items.length === 0 ? (
          <div className="app-empty">
            <p className="font-semibold text-secondary">لا طلبات بانتظار المراجعة ✓</p>
            <p className="mt-1 text-sm text-muted">
              ستظهر الطلبات هنا فور رفع الطلاب لإيصالاتهم.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {data.items.map((p) => (
              <li
                key={p.id}
                className="app-card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-lg font-black text-secondary">
                      {p.amount.toLocaleString("ar-EG")}{" "}
                      {p.currency === "SDG" ? "ج.س" : p.currency}
                    </span>
                    {p.bankReference && (
                      <code className="rounded-md bg-secondary/5 px-2 py-0.5 text-xs text-secondary" dir="ltr">
                        {p.bankReference}
                      </code>
                    )}
                    <span className="text-xs text-muted">
                      {new Date(p.createdAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                  <a
                    href={receiptHref(p.receiptUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm font-medium text-primary-dark hover:text-primary"
                  >
                    فتح الإيصال ↗
                  </a>
                </div>
                <ReviewActions paymentId={p.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
