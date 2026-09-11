import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/chrome";
import { SITE } from "@/lib/site-content";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://alameedtraining.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: `${SITE.nameAr} | تعلّم بمهارة وتقدّم بثقة`,
    template: `%s | ${SITE.nameShort}`,
  },
  description: SITE.description,
  applicationName: SITE.nameAr,
  openGraph: {
    type: "website",
    locale: "ar_SD",
    siteName: SITE.nameAr,
    title: `${SITE.nameAr} | تدريب مهني موثوق`,
    description: SITE.description,
    images: [{ url: "/brand/hero-bg.jpg", width: 1600, height: 900, alt: SITE.nameAr }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.nameAr,
    description: SITE.description,
    images: ["/brand/hero-bg.jpg"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-bold focus:text-secondary">
          الانتقال إلى المحتوى
        </a>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main id="main-content" className="flex flex-1 flex-col">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
