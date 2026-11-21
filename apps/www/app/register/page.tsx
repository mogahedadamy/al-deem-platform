import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountEntry } from "../login/account-entry";

export const metadata: Metadata = { title: "إنشاء حساب" };
export default function RegisterPage() { return <Suspense fallback={<section className="identity-page" />}><AccountEntry initialMode="register" /></Suspense>; }
