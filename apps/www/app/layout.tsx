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
    default: "مركز الديم للتدريب | Al Deem Training Center",
    template: "%s | مركز الديم للتدريب",
  },
  description:
    "البوابة الرسمية لمركز الديم للتدريب — دورات احترافية في السلامة والصحة المهنية، تطوير الذات، ومراقبة الجودة، مع شهادات معتمدة قابلة للتحقق.",
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
