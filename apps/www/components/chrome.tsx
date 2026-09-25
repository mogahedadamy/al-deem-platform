import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft, BadgeCheck, Mail, MapPin } from "lucide-react";
import { MobileNavigation } from "@/components/mobile-navigation";
import { Container } from "@/components/ui";
import { NAV_ITEMS, SITE } from "@/lib/site-content";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Container className="flex h-[4.5rem] items-center justify-between gap-4 lg:h-20">
        <Link href="/" className="brand-lockup" aria-label={`${SITE.nameAr} — الرئيسية`}>
          <span className="brand-mark">
            <Image src="/brand/logo.webp" alt="" width={48} height={48} priority className="h-full w-full object-contain" />
          </span>
          <span className="min-w-0">
            <span className="brand-title"><span className="sm:hidden">مركز العميد للتدريب</span><span className="hidden sm:inline">{SITE.nameAr}</span></span>
            <span className="brand-subtitle">{SITE.nameEn}</span>
          </span>
        </Link>

        <nav className="hidden lg:block" aria-label="القائمة الرئيسية">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="nav-link">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/verify" className="button button-ghost h-11 px-4">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            تحقق من شهادة
          </Link>
          <a href="https://learn.alameedtraining.com" className="button button-primary h-11 px-5">
            منصة التعلم
            <ArrowUpLeft className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <MobileNavigation />
      </Container>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Container>
        <div className="footer-main">
          <div className="max-w-md">
            <Link href="/" className="brand-lockup brand-lockup-light">
              <span className="brand-mark brand-mark-light">
                <Image src="/brand/logo.webp" alt="" width={48} height={48} className="h-full w-full object-contain" />
              </span>
              <span>
                <span className="brand-title text-white">{SITE.nameAr}</span>
                <span className="brand-subtitle text-white/60">{SITE.nameEn}</span>
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/65">{SITE.description}</p>
          </div>

          <div>
            <h2 className="footer-title">روابط سريعة</h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm text-white/70">
              <li><Link href="/courses">الدورات</Link></li>
              <li><Link href="/about">عن المركز</Link></li>
              <li><Link href="/verify">تحقق من شهادة</Link></li>
              <li><Link href="/contact">تواصل معنا</Link></li>
              <li><Link href="/privacy">سياسة الخصوصية</Link></li>
              <li><Link href="/terms">الشروط والأحكام</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="footer-title">تواصل معنا</h2>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-3"><MapPin className="h-4 w-4 text-accent" />{SITE.location}</li>
              <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-accent" /><a dir="ltr" href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} {SITE.nameAr}. جميع الحقوق محفوظة.</p>
          <p>تعلم بثقة · تقدّم بوضوح · أثبت إنجازك</p>
        </div>
      </Container>
    </footer>
  );
}
