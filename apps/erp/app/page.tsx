import { auth } from "@/auth";
import Link from "next/link";

export const metadata = { title: "الرئيسية" };

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

const WORKSPACES = [
  { href: "/review", title: "مراجعة المحتوى", description: "الدورات المرسلة للمراجعة — نشر أو رفض مع ملاحظات.", roles: ["content_reviewer", "system_admin"] },
  { href: "/users", title: "المستخدمون", description: "إدارة الحسابات والأدوار والصلاحيات.", roles: ["system_admin"] },
  { href: "/finance", title: "المالية", description: "مراجعة الدفعات والتسجيلات واعتمادها.", roles: ["finance_officer", "system_admin"] },
  { href: "/reports", title: "التقارير", description: "دورات، تسجيلات، إيراد معتمد وشهادات.", roles: ["erp_staff", "erp_manager", "system_admin"] },
  { href: "/papers", title: "النسخ الورقية", description: "طلبات الشهادات: اعتماد، طباعة وتسليم.", roles: ["erp_staff", "erp_manager", "system_admin"] },
  { href: "/leads", title: "الاستفسارات", description: "متابعة رسائل الموقع وتأهيلها وتحويلها.", roles: ["system_admin"] },
] as const;

export default async function ErpHome() {
  const session = await auth();
  if (!session?.user) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-center"><p className="font-semibold text-secondary">الجلسة غير نشطة</p></div>;
  }
  const token = (session as { accessToken?: string }).accessToken;
  let roles: string[] = [];
  let apiError = false;
  if (token) {
    try {
      const response = await fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (response.ok) roles = ((await response.json()) as { roles?: string[] }).roles ?? [];
      else apiError = true;
    } catch {
      apiError = true;
    }
  } else apiError = true;

  const available = WORKSPACES.filter((workspace) => workspace.roles.some((role) => roles.includes(role)));

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="app-container py-8 sm:py-10">
          <p className="app-kicker">النظام الإداري</p>
          <h1 className="app-title">مرحبًا، {session.user.name ?? "موظف الإدارة"}</h1>
          <p className="app-description">تظهر مساحات العمل المتاحة حسب صلاحيات حسابك. اختر مساحة عمل للمتابعة دون تشتيت.</p>
        </div>
      </header>
      <div className="app-page flex-1">
        {apiError ? (
          <div className="app-alert border-red-200 bg-red-50 text-red-900" role="alert">
            <p className="font-black">تعذر التحقق من صلاحيات حسابك</p>
            <p className="mt-2 text-sm text-red-700">أعد تسجيل الدخول، وإن استمرت المشكلة تواصل مع مدير النظام.</p>
          </div>
        ) : available.length === 0 ? (
          <div className="app-empty border-amber-200 bg-amber-50 text-amber-900">
            <p className="font-black">لا توجد مساحة إدارية مخصصة لهذا الحساب</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((workspace) => (
              <Link key={workspace.href} href={workspace.href} className="app-card app-card-interactive min-h-40 p-5 sm:p-6">
                <span className="app-kicker">مساحة عمل</span>
                <h2 className="mt-3 text-lg font-black text-secondary">{workspace.title}</h2>
                <p className="mt-2 text-sm leading-7 text-muted">{workspace.description}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
