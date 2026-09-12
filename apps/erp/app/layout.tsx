import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { ErpFooter, ErpHeader } from "./shell";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

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
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <div className="flex min-h-screen flex-col">
          <ErpHeader />
          <main className="flex flex-1 flex-col">{children}</main>
          <ErpFooter />
        </div>
      </body>
    </html>
  );
}
