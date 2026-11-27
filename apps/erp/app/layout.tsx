import type { Metadata } from "next";
import "@alameed/ui/src/fonts/cairo.css";
import "./globals.css";
import { ErpShell } from "./shell";

export const metadata: Metadata = {
  title: {
    default: "النظام الإداري | مركز العميد للتدريب",
    template: "%s | النظام الإداري — مركز العميد",
  },
  description:
    "النظام الإداري لمركز العميد: مراجعة المحتوى، المدفوعات، المستخدمون، التقارير والتشغيل.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <a href="#main-content" className="skip-link">تخطَّ إلى المحتوى الرئيسي</a>
        <ErpShell>{children}</ErpShell>
      </body>
    </html>
  );
}
