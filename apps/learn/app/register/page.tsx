import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginEntry } from "../login/login-entry";

export const metadata: Metadata = { title: "إنشاء حساب طالب" };

export default function RegisterPage() {
  return (
    <Suspense fallback={<section className="auth-surface"><div className="auth-card">جارٍ تجهيز بوابة الحساب…</div></section>}>
      <LoginEntry initialMode="register" />
    </Suspense>
  );
}
