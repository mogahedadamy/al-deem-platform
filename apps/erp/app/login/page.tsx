"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  function login() {
    const requested = new URLSearchParams(window.location.search).get("callbackUrl");
    const callbackUrl = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
    void signIn("keycloak", { callbackUrl });
  }

  return (
    <section className="auth-surface" aria-labelledby="erp-login-title">
      <div className="auth-card">
        <div className="auth-brand-mark">
          <Image src="/brand/logo.webp" width={64} height={64} alt="مركز العميد للتدريب" className="h-full w-full object-contain" priority />
        </div>
        <p className="auth-eyebrow">نظام العمليات الداخلي</p>
        <h1 id="erp-login-title" className="auth-title">إدارة المركز من مساحة واحدة</h1>
        <p className="auth-copy">دخول آمن لموظفي المحتوى والمالية والإدارة لمتابعة العمليات والصلاحيات والتقارير.</p>
        <button type="button" onClick={login} className="app-button app-button-primary mt-8 w-full min-h-12" aria-describedby="erp-login-note">
          تسجيل الدخول إلى النظام الإداري
        </button>
        <p id="erp-login-note" className="auth-note">نظام داخلي لأصحاب الصلاحيات فقط. تسجل جميع الإجراءات الحساسة للمراجعة.</p>
      </div>
    </section>
  );
}
