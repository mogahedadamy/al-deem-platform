import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountEntry } from "./account-entry";

export const metadata: Metadata = { title: "تسجيل الدخول" };
export default function LoginPage() { return <Suspense fallback={<section className="identity-page" />}><AccountEntry /></Suspense>; }
