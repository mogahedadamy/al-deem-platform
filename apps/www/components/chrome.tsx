// Header/Footer — بأسلوب المرجع: شعار حقيقي + تدرج + زجاجية.
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-white/80 shadow-card backdrop-blur-md">
      <nav
        aria-label="القائمة الرئيسية"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:h-20 md:px-6"
      >
        <Link href="/" className="flex flex-shrink-0 items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex h-10 w-10 transform items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-hover transition-all duration-300 hover:scale-105 md:h-12 md:w-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.webp"
              alt="شعار مركز العميد للتدريب المتقدم"
              className="h-7 w-7 object-contain drop-shadow-sm md:h-9 md:w-9"
            />
          </div>
          <div className="min-w-0">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap bg-gradient-primary bg-clip-text text-base font-bold leading-tight text-transparent md:text-2xl">
              مركز العميد للتدريب المتقدم
            </div>
            <div className="hidden text-xs font-medium text-muted-foreground md:block">
              Alameed Training Center
            </div>
          </div>
        </Link>
        <ul className="flex items-center gap-4 text-sm font-semibold md:gap-7">
          <li>
            <Link href="/" className="text-muted-foreground transition-colors hover:text-primary">
              الرئيسية
            </Link>
          </li>
          <li>
            <Link href="/courses" className="text-muted-foreground transition-colors hover:text-primary">
              الدورات
            </Link>
          </li>
          <li>
            <Link href="/about" className="text-muted-foreground transition-colors hover:text-primary">
              عن المركز
            </Link>
          </li>
          <li>
            <Link href="/verify" className="text-muted-foreground transition-colors hover:text-primary">
              تحقق من شهادة
            </Link>
          </li>
          <li>
            <a
              href="https://learn.alameedtraining.com"
              className="rounded-2xl bg-gradient-primary px-5 py-2.5 text-white shadow-hover transition-all duration-300 hover:scale-105 hover:shadow-glow"
            >
              منصة التعلم
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative bg-white">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary to-transparent" />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex flex-col items-center gap-1 md:items-start">
            <div className="text-lg font-bold text-foreground">
              مركز العميد للتدريب المتقدم
            </div>
            <p className="text-center text-sm text-muted-foreground md:text-right">
              © {new Date().getFullYear()} — جميع الحقوق محفوظة | السودان — الخرطوم
            </p>
          </div>
          <ul className="flex items-center gap-5 text-sm">
            <li>
              <Link href="/about" className="text-muted-foreground transition-colors hover:text-primary">
                عن المركز
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-muted-foreground transition-colors hover:text-primary">
                تواصل معنا
              </Link>
            </li>
            <li>
              <Link href="/verify" className="text-muted-foreground transition-colors hover:text-primary">
                تحقق من شهادة
              </Link>
            </li>
            <li>
              <a
                href="https://learn.alameedtraining.com"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                منصة التعلم
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
