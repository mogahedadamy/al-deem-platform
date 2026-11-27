import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { ErpDesktopNavigation, ErpMobileNavigation, type ErpNavItem } from "./mobile-navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";
const IDENTITY_ACCOUNT_URL = `${process.env.AUTH_ZITADEL_ISSUER ?? "http://localhost:8091"}/ui/console/users/me`;
const NAV = [
  { href: "/", label: "الرئيسية", roles: ["content_reviewer", "finance_officer", "support_agent", "erp_staff", "erp_manager", "system_admin"] },
  { href: "/review", label: "المحتوى", roles: ["content_reviewer", "system_admin"] },
  { href: "/finance", label: "المالية", roles: ["finance_officer", "system_admin"] },
  { href: "/papers", label: "الشهادات الورقية", roles: ["erp_staff", "erp_manager", "system_admin"] },
  { href: "/reports", label: "التقارير", roles: ["erp_staff", "erp_manager", "system_admin"] },
  { href: "/users", label: "المستخدمون", roles: ["system_admin"] },
  { href: "/audit", label: "سجل التدقيق", roles: ["system_admin"] },
  { href: "/leads", label: "الدعم والاستفسارات", roles: ["support_agent", "system_admin"] },
] as const;

async function availableNavigation(token?: string): Promise<ErpNavItem[]> {
  if (!token) return [];
  const response = await fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => null);
  if (!response?.ok) return [];
  const roles = ((await response.json()) as { roles?: string[] }).roles ?? [];
  return NAV.filter((item) => item.roles.some((role) => roles.includes(role))).map(({ href, label }) => ({ href, label }));
}

function ErpFooter() {
  return <footer className="border-t border-border bg-surface"><div className="app-container flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:justify-between"><span>نظام داخلي — مركز العميد للتدريب</span><span>كل إجراء حساس مسجل للمراجعة</span></div></footer>;
}

export async function ErpShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    return <div className="flex min-h-screen flex-col"><main id="main-content" className="flex flex-1 flex-col" tabIndex={-1}>{children}</main><ErpFooter /></div>;
  }

  const token = (session as { accessToken?: string }).accessToken;
  const nav = await availableNavigation(token);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="erp-topbar">
        <div className="app-container flex h-full items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="النظام الإداري — الرئيسية">
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-white p-1"><Image src="/brand/logo.webp" width={40} height={40} alt="" /></span>
            <span className="min-w-0"><strong className="block truncate text-sm text-secondary sm:text-base">نظام العميد الإداري</strong><small className="hidden text-muted sm:block">Alameed Operations</small></span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <a href={IDENTITY_ACCOUNT_URL} className="hidden min-h-11 items-center rounded-xl border border-border px-4 text-sm font-bold text-secondary hover:border-primary md:flex">الحساب وكلمة المرور</a>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><button className="min-h-11 rounded-xl border border-border px-3 text-sm font-bold text-secondary hover:border-primary sm:px-4">تسجيل الخروج</button></form>
            <ErpMobileNavigation items={nav} accountHref={IDENTITY_ACCOUNT_URL} />
          </div>
        </div>
      </header>
      <div className="erp-frame">
        <ErpDesktopNavigation items={nav} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main id="main-content" className="flex flex-1 flex-col" tabIndex={-1}>{children}</main>
          <ErpFooter />
        </div>
      </div>
    </div>
  );
}
