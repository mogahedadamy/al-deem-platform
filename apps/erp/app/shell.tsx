import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { ErpMobileNavigation } from "./mobile-navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";
const KEYCLOAK_ACCOUNT_URL = `${process.env.AUTH_KEYCLOAK_ISSUER ?? "http://localhost:8091/realms/al-deem"}/account`;
const NAV = [
  { href: "/", label: "الرئيسية", roles: ["content_reviewer", "finance_officer", "erp_staff", "erp_manager", "system_admin"] },
  { href: "/review", label: "المحتوى", roles: ["content_reviewer", "system_admin"] },
  { href: "/finance", label: "المالية", roles: ["finance_officer", "system_admin"] },
  { href: "/papers", label: "الشهادات الورقية", roles: ["erp_staff", "erp_manager", "system_admin"] },
  { href: "/reports", label: "التقارير", roles: ["erp_staff", "erp_manager", "system_admin"] },
  { href: "/users", label: "المستخدمون", roles: ["system_admin"] },
  { href: "/leads", label: "الاستفسارات", roles: ["system_admin"] },
] as const;

export async function ErpHeader() {
  const session = await auth();
  if (!session) return null;
  const token = (session as { accessToken?: string }).accessToken;
  let roles: string[] = [];
  if (token) {
    const response = await fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => null);
    if (response?.ok) roles = ((await response.json()) as { roles?: string[] }).roles ?? [];
  }
  const nav = NAV.filter((item) => item.roles.some((role) => roles.includes(role)));
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:h-20 md:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-white p-1"><Image src="/brand/logo.webp" width={40} height={40} alt="" /></span><span><strong className="block text-sm text-secondary sm:text-base">نظام العميد الإداري</strong><small className="hidden text-muted sm:block">Alameed Operations</small></span></Link>
        <nav className="hidden items-center gap-4 text-sm font-semibold text-muted lg:flex" aria-label="التنقل الإداري">{nav.map((item) => <Link key={item.href} href={item.href} className="hover:text-secondary">{item.label}</Link>)}</nav>
        <div className="flex items-center gap-2"><a href={KEYCLOAK_ACCOUNT_URL} className="hidden min-h-11 items-center rounded-xl border border-border px-4 text-sm font-bold text-secondary hover:border-primary sm:flex">الحساب وكلمة المرور</a><form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><button className="min-h-11 rounded-xl border border-border px-4 text-sm font-bold text-secondary hover:border-primary">تسجيل الخروج</button></form><ErpMobileNavigation items={nav} accountHref={KEYCLOAK_ACCOUNT_URL} /></div>
      </div>
    </header>
  );
}

export function ErpFooter() {
  return <footer className="border-t border-border bg-surface"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-xs text-muted sm:flex-row sm:justify-between"><span>نظام داخلي — مركز العميد للتدريب المتقدم</span><span>كل إجراء حساس مسجل للمراجعة</span></div></footer>;
}
