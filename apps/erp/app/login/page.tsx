"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  function login() {
    const requested = new URLSearchParams(window.location.search).get("callbackUrl");
    const callbackUrl = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
    void signIn("zitadel", { callbackUrl });
  }

  return (
    <section className="identity-page identity-page-staff" aria-labelledby="erp-login-title">
      <div className="identity-shell">
        <aside className="identity-story">
          <div className="identity-lockup"><Image src="/brand/logo.webp" width={72} height={72} alt="شعار مركز العميد للتدريب" priority /><div><span>مركز العميد للتدريب</span><small>بوابة العمليات الداخلية</small></div></div>
          <div className="identity-story-copy"><span className="identity-badge">للمصرّح لهم فقط</span><h2>إدارة موثوقة للبيانات الحساسة</h2><p>صلاحيات دقيقة، جلسات قابلة للتدقيق، وحماية متعددة المراحل لعمليات المركز.</p></div>
          <ul className="identity-points"><li>توثيق متعدد العوامل للموظفين</li><li>أقل صلاحية لازمة لكل دور</li><li>تسجيل ومراجعة الإجراءات الحساسة</li></ul>
        </aside>
        <div className="identity-panel">
          <div className="identity-mobile-brand"><Image src="/brand/logo.webp" width={52} height={52} alt="" /><strong>مركز العميد للتدريب</strong></div>
          <nav className="identity-tabs"><Link aria-current="page" href="/login">تسجيل الدخول</Link><Link href="/register">طلب حساب</Link></nav>
          <span className="identity-kicker">نظام العمليات الداخلي</span>
          <h1 id="erp-login-title">إدارة المركز من مساحة واحدة</h1>
          <p>دخول آمن لموظفي المحتوى والمالية والإدارة. استخدم حساب العمل الذي أنشأته الإدارة لك.</p>
          <button type="button" onClick={login} className="identity-action" aria-describedby="erp-login-note">تسجيل الدخول إلى النظام الإداري</button>
          <div id="erp-login-note" className="identity-security"><strong>تنبيه أمني</strong><span>لا تستخدم حساب طالب هنا. أبلغ الإدارة فوراً عن أي محاولة دخول غير معتادة.</span></div>
          <p className="identity-alternate">لم تستلم حسابك؟ <Link href="/register">اطلب دعوة آمنة</Link></p>
        </div>
      </div>
    </section>
  );
}
