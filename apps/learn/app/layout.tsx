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
    default: "منصة التعلم | مركز الديم للتدريب",
    template: "%s | منصة التعلم — مركز الديم",
  },
  description:
    "منصة التعلم الإلكتروني لمركز الديم للتدريب — دوراتي، دروسي، تقدمي، اختباراتي، وشهاداتي.",
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
