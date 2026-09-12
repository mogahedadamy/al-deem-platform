import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  if (await auth()) redirect("/dashboard");
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-br from-background via-white to-primary/10">
      <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-10 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
      <section className="app-container relative flex flex-1 flex-col items-center justify-center py-16 text-center sm:py-20 lg:py-24">
        <span className="rounded-full border border-primary/30 bg-white px-4 py-2 text-xs font-black text-primary-dark shadow-sm">منصة تعلم موحدة وآمنة</span>
        <h1 className="mt-6 max-w-3xl text-[2.35rem] font-black leading-[1.25] tracking-[-.04em] text-secondary sm:text-5xl lg:text-6xl">تعلّم بوضوح، وتابع تقدمك حتى الشهادة</h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg sm:leading-9">دوراتك ودروسك واختباراتك وشهاداتك في مساحة واحدة، مع حساب موحد وتجربة مصممة للهاتف وسطح المكتب.</p>
        <div className="mt-8 flex w-full max-w-lg flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/login?callbackUrl=/dashboard" className="app-button app-button-primary min-h-12 flex-1">تسجيل الدخول</Link>
          <a href="https://alameedtraining.com/courses" className="app-button app-button-outline min-h-12 flex-1">تصفح الدورات</a>
        </div>
        <div className="mt-10 grid w-full max-w-3xl gap-3 text-right sm:grid-cols-3">
          {[['01','تعلّم منظم','دروس ومسار تقدم واضح'],['02','اختبارات موثوقة','تصحيح خادمي ونتيجة فورية'],['03','شهادة رقمية','قابلة للتحقق من الموقع العام']].map(([n,title,text])=><div key={n} className="app-card p-5 sm:p-6"><span className="text-xs font-black text-primary-dark">{n}</span><h2 className="mt-2 font-black text-secondary">{title}</h2><p className="mt-1 text-sm leading-6 text-muted">{text}</p></div>)}
        </div>
      </section>
    </div>
  );
}
