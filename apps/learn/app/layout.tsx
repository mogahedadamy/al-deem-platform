import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { LearnFooter, LearnHeader } from "./shell";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "منصة التعلم | مركز العميد للتدريب",
    template: "%s | منصة التعلم — مركز العميد",
  },
  description:
    "منصة التعلم الإلكتروني لمركز العميد للتدريب — دوراتي، دروسي، تقدمي، اختباراتي، وشهاداتي.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <div className="flex min-h-screen flex-col">
          <LearnHeader />
          <main className="flex flex-1 flex-col">{children}</main>
          <LearnFooter />
        </div>
      </body>
    </html>
  );
}
