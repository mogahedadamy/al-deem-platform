"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

type Portal = "www" | "learn" | "erp";
type Mode = "login" | "register";

const portals = {
  www: {
    label: "الحساب الموحد",
    login: "ادخل إلى حسابك بأمان",
    register: "ابدأ رحلتك مع العميد",
  },
  learn: {
    label: "منصة التعلّم",
    login: "مرحباً بعودتك",
    register: "ابدأ رحلتك التعليمية بثقة",
  },
  erp: {
    label: "بوابة الموظفين",
    login: "إدارة المركز من مساحة واحدة",
    register: "اطلب دعوة من مسؤولك",
  },
};

function localDestination(value: string | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\s]/u.test(value.split(/[?#]/, 1)[0] ?? "")) return undefined;
  if (Array.from(value).some((char) => char.charCodeAt(0) < 32)) return undefined;
  const url = new URL(value, "https://local.invalid");
  if (url.origin !== "https://local.invalid" || url.pathname.startsWith("//")) return undefined;
  return url.pathname + url.search + url.hash;
}

type Props = {
  portal: Portal;
  mode: Mode;
  callbackUrl?: string;
  helpUrl?: string;
};

export function AccountEntry({ portal, mode, callbackUrl, helpUrl }: Props) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const next = localDestination(callbackUrl);
  const query = next ? "?" + new URLSearchParams({ callbackUrl: next }) : "";
  const staff = portal === "erp";
  const registering = mode === "register";
  const invitation = staff && registering;
  const content = portals[portal];

  async function proceed() {
    setBusy(true);
    setFailed(false);
    try {
      await signIn("zitadel", { redirectTo: next ?? (portal === "learn" ? "/dashboard" : "/") },
        registering ? { prompt: "create" } : undefined);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="identity-page" aria-labelledby="identity-title">
      <div className="identity-shell">
        <div className="identity-brand">
          <Image src="/brand/logo.webp" alt="" width={72} height={72} priority />
          <div><strong>مركز العميد للتدريب</strong><span>{content.label}</span></div>
        </div>
        <div className="identity-panel">
          <nav className="identity-tabs" aria-label="إجراءات الحساب">
            <Link href={"/login" + query} aria-current={!registering ? "page" : undefined}>تسجيل الدخول</Link>
            <Link href={"/register" + query} aria-current={registering ? "page" : undefined}>{staff ? "طلب حساب" : "إنشاء حساب"}</Link>
          </nav>
          <h1 id="identity-title">{content[mode]}</h1>
          <p>{invitation
            ? "اطلب من مسؤول وحدتك دعوة إلى بريد العمل، واذكر المهمة التي تحتاج صلاحية لتنفيذها."
            : staff ? "تابع إلى بوابة الحساب باستخدام بريد العمل المرتبط بدعوة الإدارة."
            : registering ? "أنشئ حساب طالب ببريدك الإلكتروني عبر بوابة الحساب، ثم عُد لإكمال خطوتك."
            : "تابع إلى بوابة الحساب للدخول ببريدك الإلكتروني. يمكنك أيضاً استعادة كلمة المرور من هناك."}</p>
          {invitation ? (
            <a className="identity-action" href="mailto:support@alameedtraining.com?subject=طلب%20حساب%20موظف">إرسال طلب إلى الدعم</a>
          ) : (
            <button type="button" className="identity-action" disabled={busy} onClick={proceed}>
              {busy ? "جارٍ فتح بوابة الحساب…" : registering ? "إنشاء حساب طالب" : staff ? "تسجيل الدخول إلى النظام الإداري" : "متابعة إلى تسجيل الدخول"}
            </button>
          )}
          {failed && <p role="alert">تعذّر فتح بوابة الحساب. حاول مجدداً.</p>}
          {helpUrl && <a className="identity-help" href={helpUrl}>تواصل مع المركز للمساعدة</a>}
        </div>
      </div>
    </section>
  );
}
