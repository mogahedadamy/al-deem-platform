import type { Metadata } from "next";
import { AccountEntry } from "@alameed/ui/src/account-entry";

export const metadata: Metadata = { title: "طلب حساب موظف" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;
  return <AccountEntry portal="erp" mode="register" callbackUrl={callbackUrl} />;
}
