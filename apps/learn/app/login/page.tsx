import type { Metadata } from "next";
import { AccountEntry } from "@alameed/ui/src/account-entry";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;
  const helpUrl = new URL("/contact", process.env.NEXT_PUBLIC_SITE_URL || "https://alameedtraining.com").href;
  return <AccountEntry portal="learn" mode={params.mode === "register" ? "register" : "login"} callbackUrl={callbackUrl} helpUrl={helpUrl} />;
}
