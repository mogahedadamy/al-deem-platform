// تسجيل الدخول للنظام الإداري — Keycloak SSO.
"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-3xl font-black text-primary shadow-lg">
        دي
      </div>
      <h1 className="max-w-xl text-3xl font-black leading-snug text-secondary md:text-4xl">
        النظام الإداري — مركز الديم للتدريب
      </h1>
      <p className="mt-4 max-w-md leading-8 text-muted">
        دخول موظفي الإدارة: مراجعة المحتوى، المالية، المستخدمون، التقارير.
        عبر الحساب الموحد فقط.
      </p>
      <button
        onClick={() => signIn("keycloak", { callbackUrl: "/" })}
        className="mt-10 flex h-12 items-center justify-center rounded-full bg-secondary px-10 font-semibold text-secondary-foreground transition-transform hover:scale-105"
      >
        تسجيل الدخول
      </button>
      <p className="mt-8 text-xs text-muted">
        نظام داخلي — الوصول لأصحاب الصلاحيات فقط، ويُسجَّل كل إجراء.
      </p>
    </div>
  );
}
