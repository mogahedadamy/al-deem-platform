import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "النظام الإداري | مركز الديم للتدريب",
    template: "%s | النظام الإداري — مركز الديم",
  },
  description:
    "النظام الإداري المتخصص لمركز الديم: مراجعة المحتوى، المدفوعات، المستخدمون، التقارير، والتشغيل.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
