"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  function login() {
    const requested = new URLSearchParams(window.location.search).get("callbackUrl");
    const callbackUrl = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";
    void signIn("keycloak", { callbackUrl });
  }

  return (
    <section className="auth-surface" aria-labelledby="login-title">
      <div className="auth-card">
        <div className="auth-brand-mark">
          <Image src="/brand/logo.webp" width={64} height={64} alt="مركز العميد للتدريب" className="h-full w-full object-contain" priority />
        </div>
        <p className="auth-eyebrow">منصة التعلم الموحدة</p>
        <h1 id="login-title" className="auth-title">مرحبًا بعودتك إلى رحلة التعلّم</h1>
        <p className="auth-copy">سجّل الدخول بحساب المركز للوصول إلى دوراتك ودروسك وتقدمك وشهاداتك من أي جهاز.</p>
        <button type="button" onClick={login} className="app-button app-button-primary mt-8 w-full min-h-12" aria-describedby="login-note">
          تسجيل الدخول عبر حساب المركز
        </button>
        <p id="login-note" className="auth-note">يتم تأمين الدخول عبر الحساب الموحد للمركز، ويُنشأ ملفك التعليمي تلقائيًا عند أول دخول.</p>
      </div>
    </section>
  );
}
