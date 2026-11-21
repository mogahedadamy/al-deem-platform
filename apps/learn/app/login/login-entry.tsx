"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

type EntryMode = "login" | "register";

function safeCallback(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export function LoginEntry({ initialMode = "login" }: { initialMode?: EntryMode }) {
  const searchParams = useSearchParams();
  const requestedMode: EntryMode = searchParams.get("mode") === "register" ? "register" : initialMode;
  const [mode] = useState<EntryMode>(requestedMode);
  const [busy, setBusy] = useState(false);
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"));

  async function continueToIdentityProvider(nextMode: EntryMode) {
    setBusy(true);
    try {
      await signIn(
        "zitadel",
        { callbackUrl },
        nextMode === "register" ? { prompt: "create" } : undefined,
      );
    } finally {
      setBusy(false);
    }
  }

  const registering = mode === "register";

  return (
    <section className="auth-surface" aria-labelledby="login-title">
      <div className="auth-orbit auth-orbit-one" aria-hidden="true" />
      <div className="auth-orbit auth-orbit-two" aria-hidden="true" />
      <div className="auth-card auth-card-wide">
        <div className="auth-brand-row">
          <div className="auth-brand-mark">
            <Image src="/brand/logo.webp" width={64} height={64} alt="شعار مركز العميد للتدريب" className="h-full w-full object-contain" priority />
          </div>
          <div className="text-right">
            <p className="auth-eyebrow !mt-0">الحساب الموحد</p>
            <p className="mt-1 text-sm font-black text-secondary">مركز العميد للتدريب</p>
          </div>
        </div>

        <div className="auth-mode-switch" role="tablist" aria-label="اختيار إجراء الحساب">
          <Link role="tab" aria-selected={!registering} className={!registering ? "is-active" : ""} href="/login">تسجيل الدخول</Link>
          <Link role="tab" aria-selected={registering} className={registering ? "is-active" : ""} href="/register">إنشاء حساب</Link>
        </div>

        <h1 id="login-title" className="auth-title">
          {registering ? "ابدأ رحلتك التعليمية بثقة" : "مرحباً بعودتك"}
        </h1>
        <p className="auth-copy">
          {registering
            ? "أنشئ حساب طالب مجاناً، ثم عُد مباشرةً لإكمال التسجيل في البرنامج الذي اخترته."
            : "سجّل الدخول بأمان للوصول إلى دوراتك، تقدمك، مدفوعاتك وشهاداتك من أي جهاز."}
        </p>

        <div className="auth-benefits" aria-label="مزايا الحساب">
          <span>حساب واحد لكل خدمات المركز</span>
          <span>دخول آمن واستعادة سهلة</span>
          <span>تعود إلى خطوتك تلقائياً</span>
        </div>

        <button
          type="button"
          onClick={() => void continueToIdentityProvider(mode)}
          disabled={busy}
          className="app-button app-button-primary auth-primary-action mt-8 w-full"
        >
          {busy ? "جارٍ فتح بوابة الحساب الآمنة…" : registering ? "إنشاء حساب طالب" : "متابعة إلى تسجيل الدخول"}
        </button>

        <p className="auth-note">
          ستفتح بوابة الحساب الآمنة لإدخال بياناتك. ستجد فيها خيار <strong>نسيت كلمة المرور؟</strong> لتعيين كلمة مرور جديدة عبر بريدك الإلكتروني.
        </p>

        {!registering ? (
          <p className="mt-5 text-sm leading-7 text-muted">ليس لديك حساب؟ <Link href="/register" className="font-black text-primary-dark underline underline-offset-4">أنشئ حساب طالب جديد</Link></p>
        ) : (
          <p className="mt-5 text-sm leading-7 text-muted">هل لديك حساب بالفعل؟ <Link href="/login" className="font-black text-primary-dark underline underline-offset-4">سجّل الدخول</Link></p>
        )}

        <div className="auth-help-row">
          <Link href="https://alameedtraining.com/contact">هل تحتاج مساعدة؟</Link>
          <span aria-hidden="true">•</span>
          <span>المدربون والموظفون يحصلون على حساباتهم بدعوة من الإدارة</span>
        </div>
      </div>
    </section>
  );
}
