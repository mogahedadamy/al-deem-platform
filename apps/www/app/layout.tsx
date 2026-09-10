import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "600", "700", "900"],
});

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://alameedtraining.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: "مركز الديم للتدريب | Al Deem Training Center",
    template: "%s | مركز الديم للتدريب",
  },
  description:
    "البوابة الرسمية لمركز الديم للتدريب — دورات احترافية في السلامة والصحة المهنية، تطوير الذات، ومراقبة الجودة، مع شهادات معتمدة قابلة للتحقق.",
  openGraph: {
    type: "website",
    locale: "ar_SD",
    siteName: "مركز الديم للتدريب",
    title: "مركز الديم للتدريب | Al Deem Training Center",
    description:
      "دورات احترافية معتمدة مع شهادات إلكترونية قابلة للتحقق — تعلّم في وقتك مع مدربين معتمدين.",
  },
  twitter: {
    card: "summary_large_image",
    title: "مركز الديم للتدريب",
    description: "دورات احترافية معتمدة مع شهادات إلكترونية قابلة للتحقق.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
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
