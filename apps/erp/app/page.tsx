// الرئيسية للـerp — قائمة انتظار مراجعة المحتوى (content_reviewer).
// البيانات من core-api عبر access token من الجلسة (R2 سيمرر الرمز فعليًا؛
// الآن نجرب الاتصال المباشر بـclient credentials للقراءة العامة).
import { auth } from "@/auth";
import Link from "next/link";

export const metadata = { title: "الرئيسية" };

// الواجهة الأولية لقائمة الانتظار — placeholder حتى يصل access token للـAPI
// (R2). حاليًا تعرض حالة الارتباط فقط.
export default async function ErpHome() {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-semibold text-secondary">الجلسة غير نشطة</p>
      </div>
    );
  }

  const user = session.user as { name?: string | null; roles?: string[] };
  const canReview = (user.roles ?? []).some((r) =>
    ["content_reviewer", "system_admin"].includes(r),
  );

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-sm text-muted">النظام الإداري</p>
          <h1 className="mt-1 text-3xl font-black text-secondary">
            مرحبًا، {user.name ?? "موظف الإدارة"}
          </h1>
          <p className="mt-2 text-muted">
            {canReview
              ? "مراجعة المحتوى: الدورات بانتظار قرارك."
              : "مساحة عملك الإدارية."}
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {/* بطاقات الوصول السريع حسب الدور */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/review"
            className={`rounded-xl border border-border bg-surface p-5 transition-colors ${
              canReview ? "hover:border-primary" : "pointer-events-none opacity-40"
            }`}
          >
            <h2 className="font-bold text-secondary">مراجعة المحتوى</h2>
            <p className="mt-1 text-sm text-muted">
              الدورات المرسلة للمراجعة — نشر أو رفض مع ملاحظات.
            </p>
          </Link>
          <Link
            href="/users"
            className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary"
          >
            <h2 className="font-bold text-secondary">المستخدمون</h2>
            <p className="mt-1 text-sm text-muted">
              إدارة الحسابات والأدوار والصلاحيات.
            </p>
          </Link>
          <Link
            href="/finance"
            className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary"
          >
            <h2 className="font-bold text-secondary">المالية</h2>
            <p className="mt-1 text-sm text-muted">
              مراجعة الدفعات والتسجيلات — موظف مالي مخصص 24/7.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
