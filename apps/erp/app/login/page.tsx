import type { Metadata } from "next";
import { AccountEntry } from "@alameed/ui/src/account-entry";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;
  return <AccountEntry portal="erp" mode="login" callbackUrl={callbackUrl} />;
}
