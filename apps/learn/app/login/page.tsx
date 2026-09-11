// صفحة تسجيل الدخول — تحوّل إلى Keycloak SSO عند الضغط.
// Auth.js يدير الجلسة كاملة؛ هذه مجرد نقطة دخول UI.
"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  function login() {
    const requested = new URLSearchParams(window.location.search).get("callbackUrl");
    const callbackUrl = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";
    void signIn("keycloak", { callbackUrl });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-3xl font-black text-primary shadow-lg">
        دي
      </div>
      <h1 className="max-w-xl text-3xl font-black leading-snug text-secondary md:text-4xl">
        منصة التعلم — مركز العميد للتدريب
      </h1>
      <p className="mt-4 max-w-md leading-8 text-muted">
        سجّل الدخول عبر الحساب الموحد للمركز للوصول إلى دوراتك ودروسك
        وشهاداتك.
      </p>
      <button
        onClick={login}
        className="mt-10 flex h-12 items-center justify-center rounded-full bg-secondary px-10 font-semibold text-secondary-foreground transition-transform hover:scale-105"
      >
        تسجيل الدخول عبر حساب المركز
      </button>
      <p className="mt-8 text-sm text-muted">
        ليس لديك حساب؟ يُنشأ تلقائيًا عند أول تسجيل دخول.
      </p>
    </div>
  );
}
