// Header/Footer مشتركة لصفحات الموقع العام.
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <nav
        aria-label="القائمة الرئيسية"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6"
      >
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-black text-primary">
            دي
          </span>
          <span className="font-bold text-secondary">مركز الديم للتدريب</span>
        </Link>
        <ul className="flex items-center gap-6 text-sm font-semibold">
          <li>
            <Link href="/" className="text-muted transition-colors hover:text-primary">
              الرئيسية
            </Link>
          </li>
          <li>
            <Link href="/courses" className="text-muted transition-colors hover:text-primary">
              الدورات
            </Link>
          </li>
          <li>
            <Link href="/verify" className="text-muted transition-colors hover:text-primary">
              تحقق من شهادة
            </Link>
          </li>
          <li>
            <a
              href="https://learn.alameedtraining.com"
              className="rounded-full bg-secondary px-5 py-2 text-secondary-foreground transition-transform hover:scale-105"
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
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} مركز الديم للتدريب — جميع الحقوق محفوظة
          </p>
          <ul className="flex items-center gap-5 text-sm">
            <li>
              <Link href="/about" className="text-muted transition-colors hover:text-primary">
                عن المركز
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-muted transition-colors hover:text-primary">
                تواصل معنا
              </Link>
            </li>
            <li>
              <Link href="/verify" className="text-muted transition-colors hover:text-primary">
                تحقق من شهادة
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
