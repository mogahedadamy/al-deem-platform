import { Suspense } from "react";
import { LoginEntry } from "./login-entry";

export default function LoginPage() {
  return (
    <Suspense fallback={<section className="auth-surface"><div className="auth-card text-center text-sm font-bold text-muted">جارٍ تجهيز بوابة الحساب…</div></section>}>
      <LoginEntry />
    </Suspense>
  );
}
