import type { Metadata } from "next";
import "./globals.css";
import { LearnFooter, LearnHeader } from "./shell";

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
    <html lang="ar" dir="rtl" className="h-full antialiased">
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
