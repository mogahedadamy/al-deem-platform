import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { LearnMobileNavigation } from "./mobile-navigation";

const NAV = [
  { href: "/dashboard", label: "لوحة التحكم" },
  { href: "/certificates", label: "شهاداتي" },
  { href: "/profile", label: "ملفي" },
  { href: "https://alameedtraining.com/courses", label: "الدورات" },
];
const KEYCLOAK_ACCOUNT_URL = `${process.env.AUTH_KEYCLOAK_ISSUER ?? "http://localhost:8091/realms/al-deem"}/account`;

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
            <nav className="hidden items-center gap-5 text-sm font-semibold text-muted md:flex" aria-label="تنقل منصة التعلم">{NAV.map((item) => <Link key={item.href} href={item.href} className="hover:text-secondary">{item.label}</Link>)}</nav>
            <div className="flex items-center gap-2">
              <span className="hidden max-w-40 truncate text-xs text-muted lg:block">{session.user?.name ?? session.user?.email}</span>
              <a href={KEYCLOAK_ACCOUNT_URL} className="hidden min-h-11 items-center rounded-xl border border-border px-4 text-sm font-bold text-secondary hover:border-primary lg:inline-flex">حسابي</a>
              <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}><button className="min-h-11 rounded-xl border border-border px-4 text-sm font-bold text-secondary hover:border-primary">تسجيل الخروج</button></form>
              <LearnMobileNavigation items={[...NAV, { href: KEYCLOAK_ACCOUNT_URL, label: "الحساب وكلمة المرور" }]} />
            </div>
          </>
        ) : <Link href="/login" className="min-h-11 rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-white">تسجيل الدخول</Link>}
      </div>
    </header>
  );
}

export function LearnFooter() {
  return <footer className="border-t border-border bg-surface"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-muted sm:flex-row sm:justify-between"><span>© {new Date().getFullYear()} مركز العميد للتدريب المتقدم</span><Link href="https://alameedtraining.com">الموقع الرسمي</Link></div></footer>;
}
