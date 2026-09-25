import Link from "next/link";
import { auth } from "@/auth";
import { API_BASE } from "@/lib/api";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "ملفي الشخصي" };

type Profile = { fullName: string; email: string; phone?: string | null; bio?: string | null };

export default async function ProfilePage() {
  const session = await auth();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;
  let profile: Profile | null = null;
  if (accessToken) {
    const response = await fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }).catch(() => null);
    if (response?.ok) profile = await response.json() as Profile;
  }

  if (!profile) {
    return <main className="app-page"><div className="app-alert border-amber-200 bg-amber-50 text-amber-900"><p className="font-black">تعذر تحميل ملفك الشخصي</p><p className="mt-2 text-sm leading-7">تأكد من اتصالك ثم أعد المحاولة. لم تتأثر بيانات حسابك.</p><Link href="/dashboard" className="app-button app-button-primary mt-5">العودة إلى لوحة التحكم</Link></div></main>;
  }

  const accountUrl = `${process.env.AUTH_KEYCLOAK_ISSUER ?? "http://localhost:8091/realms/al-deem"}/account`;
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface"><div className="app-container py-8 sm:py-10"><nav className="mb-3 text-sm text-muted" aria-label="مسار التنقل"><Link href="/dashboard" className="hover:text-primary">لوحة التحكم</Link><span className="mx-2">/</span><span className="font-medium text-secondary">ملفي الشخصي</span></nav><p className="app-kicker">الحساب</p><h1 className="app-title">بياناتك وحماية حسابك</h1><p className="app-description">حدّث بياناتك الأساسية هنا، واستخدم بوابة الحساب الآمنة لتغيير البريد أو كلمة المرور وإدارة الأجهزة والجلسات.</p></div></header>
      <main className="app-page flex-1"><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]"><ProfileForm profile={profile} /><aside className="app-card h-fit p-5"><h2 className="font-black text-secondary">حماية الحساب</h2><p className="mt-2 text-sm leading-7 text-muted">كلمة المرور، البريد الإلكتروني، التحقق الثنائي والجلسات تُدار من بوابة الحساب الموحدة.</p><a href={accountUrl} className="app-button app-button-outline mt-5 w-full">إدارة الحساب وكلمة المرور</a></aside></div></main>
    </div>
  );
}
