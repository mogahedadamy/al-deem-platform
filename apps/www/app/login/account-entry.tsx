"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

type EntryMode = "login" | "register";

function safeCallback(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function AccountEntry({ initialMode = "login" }: { initialMode?: EntryMode }) {
  const searchParams = useSearchParams();
  const mode: EntryMode = searchParams.get("mode") === "register" ? "register" : initialMode;
  const [busy, setBusy] = useState(false);
  const registering = mode === "register";

  async function continueSecurely() {
    setBusy(true);
    try {
      await signIn("zitadel", { callbackUrl: safeCallback(searchParams.get("callbackUrl")) }, registering ? { prompt: "create" } : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="identity-page" aria-labelledby="identity-title">
      <div className="identity-shell">
        <aside className="identity-story" aria-label="مزايا الحساب الموحد">
          <div className="identity-lockup">
            <Image src="/brand/logo.webp" width={72} height={72} alt="شعار مركز العميد للتدريب" priority />
            <div><span>مركز العميد للتدريب</span><small>حساب واحد. تعلّم مستمر.</small></div>
          </div>
          <div className="identity-story-copy">
            <span className="identity-badge">الحساب الموحد</span>
            <h2>كل خدمات المركز، بهوية واحدة آمنة</h2>
            <p>سجّل مرة واحدة وانتقل إلى منصة التعلم وخدمات المركز دون تكرار كلمة المرور.</p>
          </div>
          <ul className="identity-points">
            <li>جلسة محفوظة وآمنة على جهازك</li><li>استعادة الحساب والتحقق من البريد</li><li>حماية إضافية للحسابات الحساسة</li>
          </ul>
        </aside>
        <div className="identity-panel">
          <div className="identity-mobile-brand"><Image src="/brand/logo.webp" width={52} height={52} alt="" /><strong>مركز العميد للتدريب</strong></div>
          <nav className="identity-tabs" aria-label="إجراءات الحساب"><Link aria-current={!registering ? "page" : undefined} href="/login">تسجيل الدخول</Link><Link aria-current={registering ? "page" : undefined} href="/register">إنشاء حساب</Link></nav>
          <span className="identity-kicker">{registering ? "حساب طالب جديد" : "مرحباً بعودتك"}</span>
          <h1 id="identity-title">{registering ? "ابدأ رحلتك مع العميد" : "ادخل إلى حسابك بأمان"}</h1>
          <p>{registering ? "أنشئ حسابك مجاناً عبر بوابة الهوية الرسمية، ثم استخدمه في جميع منصات المركز." : "سننقلك إلى بوابة الهوية الرسمية. إذا كانت جلستك محفوظة فستعود مباشرة دون إدخال بياناتك من جديد."}</p>
          <button className="identity-action" type="button" disabled={busy} onClick={() => void continueSecurely()}>{busy ? "جارٍ فتح البوابة الآمنة…" : registering ? "إنشاء حساب طالب" : "متابعة إلى تسجيل الدخول"}</button>
          <div className="identity-security"><strong>قبل المتابعة</strong><span>تأكد أن بوابة الدخول تحمل نطاق المركز، ولا تشارك رمز التحقق مع أي شخص.</span></div>
          <p className="identity-alternate">{registering ? <>لديك حساب؟ <Link href="/login">سجّل الدخول</Link></> : <>جديد في المركز؟ <Link href="/register">أنشئ حساباً</Link></>}</p>
        </div>
      </div>
    </section>
  );
}
