import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { SITE_URL, siteUrl } from "@/lib/site-url";
import { LearnMobileNavigation } from "./mobile-navigation";

const NAV = [
  { href: "/dashboard", label: "لوحة التحكم" },
  { href: "/certificates", label: "شهاداتي" },
  { href: siteUrl("/courses"), label: "الدورات" },
];
const IDENTITY_ACCOUNT_URL = `${process.env.AUTH_ZITADEL_ISSUER ?? "http://localhost:8091"}/ui/console/users/me`;

export async function LearnHeader() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:h-20 md:px-6">
        <Link href={session ? "/dashboard" : "/"} className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-white p-1"><Image src="/brand/logo.webp" width={40} height={40} alt="" /></span>
          <span className="min-w-0"><strong className="block truncate text-sm text-secondary sm:text-base">منصة العميد للتعلم</strong><small className="hidden text-muted sm:block">Alameed Learning</small></span>
        </Link>
        {session ? (
          <>
            <nav className="hidden items-center gap-3 text-sm font-semibold text-muted md:flex lg:gap-5" aria-label="تنقل منصة التعلم">{NAV.map((item) => <Link key={item.href} href={item.href} className="flex min-h-11 items-center whitespace-nowrap px-1 hover:text-secondary">{item.label}</Link>)}</nav>
            <div className="flex items-center gap-2">
              <details className="account-menu relative hidden md:block">
                <summary className="flex min-h-11 max-w-36 cursor-pointer list-none items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold text-secondary hover:border-primary" aria-label="فتح قائمة الحساب">
                  <span className="truncate">{session.user?.name ?? "حسابي"}</span>
                  <span aria-hidden="true">⌄</span>
                </summary>
                <div className="absolute end-0 top-[calc(100%+.5rem)] z-50 w-64 rounded-2xl border border-border bg-surface p-2 shadow-xl">
                  <p className="truncate border-b border-border px-3 py-2 text-xs text-muted" dir="auto">{session.user?.email}</p>
                  <Link href="/profile" className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-secondary hover:bg-surface-soft">ملفي الشخصي</Link>
                  <a href={IDENTITY_ACCOUNT_URL} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-secondary hover:bg-surface-soft">الحساب وكلمة المرور</a>
                  <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                    <button className="flex min-h-11 w-full items-center rounded-xl px-3 text-sm font-bold text-danger hover:bg-red-50">تسجيل الخروج</button>
                  </form>
                </div>
              </details>
              <LearnMobileNavigation items={[...NAV, { href: "/profile", label: "ملفي الشخصي" }, { href: IDENTITY_ACCOUNT_URL, label: "الحساب وكلمة المرور" }]}>
                <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                  <button className="flex min-h-11 w-full items-center rounded-xl px-3 text-sm font-bold text-danger hover:bg-red-50">تسجيل الخروج</button>
                </form>
              </LearnMobileNavigation>
            </div>
          </>
        ) : <Link href="/login" className="min-h-11 rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-white">تسجيل الدخول</Link>}
      </div>
    </header>
  );
}

export function LearnFooter() {
  return <footer className="border-t border-border bg-surface"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-muted sm:flex-row sm:justify-between"><span>© {new Date().getFullYear()} مركز العميد للتدريب</span><Link href={SITE_URL}>الموقع الرسمي</Link></div></footer>;
}
