import type { Metadata } from "next";
import { AccountEntry } from "@alameed/ui/src/account-entry";

export const metadata: Metadata = { title: "إنشاء حساب طالب" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;
  const helpUrl = new URL("/contact", process.env.NEXT_PUBLIC_SITE_URL || "https://alameedtraining.com").href;
  return <AccountEntry portal="learn" mode="register" callbackUrl={callbackUrl} helpUrl={helpUrl} />;
}
