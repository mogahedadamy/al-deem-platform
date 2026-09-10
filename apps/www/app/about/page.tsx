// عن المركز — صفحة تعريفية عامة (Blueprint 7.5: www pages).
import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/chrome";

export const metadata: Metadata = {
  title: "عن المركز",
  description:
    "تعرّف على مركز الديم للتدريب — رسالتنا ورؤيتنا ونهجنا في التدريب الاحترافي المعتمد.",
};

const VALUES = [
  {
    icon: "✦",
    title: "جودة قبل السرعة",
    desc: "كل دورة تمر بمراجعة محتوى مستقلة قبل النشر — لا استثناءات.",
  },
  {
    icon: "◈",
    title: "شهادة ذات معنى",
    desc: "شهادتنا تصدر فقط باجتياز اختبار معياري بنسبة 70% فأكثر — قيمة حقيقية.",
  },
  {
    icon: "⌘",
    title: "متعلّم أولًا",
    desc: "منصتنا مبنية حول رحلة الطالب: تسجيل، تعلّم، اختبار، شهادة، ونسخة ورقية عند الطلب.",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* ===== Hero ===== */}
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center md:py-20">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-2xl font-black text-primary shadow-lg mx-auto">
              دي
            </span>
            <h1 className="mt-6 text-3xl font-black leading-[1.3] text-secondary md:text-4xl">
              عن مركز الديم للتدريب
            </h1>
            <p className="mt-4 text-lg leading-8 text-muted">
              مركز تدريب متخصص يقدّم برامج احترافية في الإدارة والمالية وتقنية
              المعلومات واللغات، بمنهجية معتمدة تجمع بين التعلّم المرن
              والتقييم الصارم.
            </p>
          </div>
        </section>

        {/* ===== الرسالة والرؤية ===== */}
        <section className="mx-auto max-w-6xl px-6 py-14" aria-labelledby="mission">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface p-8">
              <h2 className="text-xl font-black text-secondary">رسالتنا</h2>
              <p className="mt-3 leading-8 text-muted">
                تمكين الأفراد والمؤسسات بالمهارات العملية المطلوبة في سوق
                العمل، عبر برامج تدريبية عالية الجودة يقودها مدربون معتمدون،
                وتُختتم بشهادة موثّقة تثبت الكفاءة الحقيقية — لا مجرد الحضور.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-8">
              <h2 className="text-xl font-black text-secondary">رؤيتنا</h2>
              <p className="mt-3 leading-8 text-muted">
                أن نكون المرجع الأول في التدريب الاحترافي المعتمد إقليميًا،
                بمنصة رقمية تجعل التعليم المُقيَّم في متناول الجميع، في أي وقت
                ومن أي مكان.
              </p>
            </div>
          </div>
        </section>

        {/* ===== قيمنا ===== */}
        <section className="border-t border-border bg-surface" aria-labelledby="values">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <h2 id="values" className="mb-8 text-center text-2xl font-black text-secondary">
              قيمنا
            </h2>
            <div className="grid gap-8 text-center sm:grid-cols-3">
              {VALUES.map((v) => (
                <div key={v.title} className="flex flex-col items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-xl text-primary-dark">
                    {v.icon}
                  </span>
                  <h3 className="font-bold text-secondary">{v.title}</h3>
                  <p className="text-sm leading-6 text-muted">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== رحلة الشهادة ===== */}
        <section className="mx-auto max-w-4xl px-6 py-14" aria-labelledby="journey">
          <h2 id="journey" className="mb-8 text-center text-2xl font-black text-secondary">
            رحلة الشهادة عندنا
          </h2>
          <ol className="space-y-4">
            {[
              { step: "١", title: "اختر دورتك", desc: "تصفّح الكتالوج وسجّل في الدورة المناسبة لمستواك." },
              { step: "٢", title: "أكمل الدروس", desc: "تعلّم في وقتك — دروس مسجلة، وحصص مباشرة للدورات التي تتضمنها." },
              { step: "٣", title: "اجتز الاختبار", desc: "اختبار معياري بنسبة 70% فأكثر — القرار المعتمد من الإدارة." },
              { step: "٤", title: "استلم شهادتك", desc: "شهادة رقمية فورية قابلة للتحقق، واطلب نسخة ورقية رسمية عند الحاجة." },
            ].map((s) => (
              <li
                key={s.step}
                className="flex items-start gap-5 rounded-xl border border-border bg-surface p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 font-black text-primary-dark">
                  {s.step}
                </span>
                <div>
                  <h3 className="font-bold text-secondary">{s.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <Link
              href="/courses"
              className="inline-flex h-12 items-center justify-center rounded-full bg-secondary px-8 font-semibold text-secondary-foreground transition-transform hover:scale-105"
            >
              تصفّح الدورات
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
