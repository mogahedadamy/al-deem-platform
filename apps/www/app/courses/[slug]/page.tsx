import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, BookOpenCheck, Check, Clock3, LockKeyhole, Radio, ShieldCheck } from "lucide-react";
import { getCourse, getCourseOutline, RequestError } from "@/lib/api";
import { ErrorState, formatPrice, LevelBadge } from "@/components/catalog";
import { ButtonLink, Container } from "@/components/ui";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const course = await getCourse(slug);
    return {
      title: course.title,
      description: course.summary,
      alternates: { canonical: `/courses/${slug}` },
      openGraph: { title: course.title, description: course.summary, type: "website", locale: "ar_SD", images: course.coverImageUrl ? [course.coverImageUrl] : undefined },
    };
  } catch {
    return { title: "الدورة غير متاحة" };
  }
}

function localImage(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith("alameedtraining.com") ? parsed.pathname : null;
  } catch { return null; }
}

export default async function CourseDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  let course: Awaited<ReturnType<typeof getCourse>> | null = null;
  let outline: Awaited<ReturnType<typeof getCourseOutline>> | null = null;
  let error: string | null = null;

  try {
    [course, outline] = await Promise.all([getCourse(slug), getCourseOutline(slug)]);
  } catch (reason) {
    if (reason instanceof RequestError && reason.status === 404) notFound();
    error = reason instanceof RequestError ? reason.message : "تعذر تحميل الدورة";
  }

  if (error) return <Container className="py-16"><ErrorState message={error} /></Container>;
  if (!course) return null;

  const lessonCount = (outline?.sections ?? []).reduce((total, section) => total + section.lessons.length, 0);
  const image = localImage(course.coverImageUrl);
  const readyForEnrollment = lessonCount > 0;
  const schema = {
    "@context": "https://schema.org", "@type": "Course", name: course.title, description: course.summary,
    provider: { "@type": "Organization", name: "مركز العميد للتدريب المتقدم", sameAs: "https://alameedtraining.com" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="relative overflow-hidden bg-secondary text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(239,139,48,.2),transparent_32%)]" />
        <Container className="relative z-10 py-10 lg:py-16">
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-white/55" aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><span>/</span><Link href="/courses">الدورات</Link><span>/</span><span className="text-white/80">{course.title}</span></nav>
          <div className="grid items-center gap-9 lg:grid-cols-[1.15fr_.85fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2"><LevelBadge level={course.level} />{course.hasLiveSessions && <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-200"><Radio className="h-3.5 w-3.5" /> يتضمن بثاً مباشراً</span>}</div>
              <h1 className="mt-5 max-w-3xl text-3xl font-black leading-[1.35] tracking-[-.035em] text-white sm:text-4xl lg:text-5xl">{course.title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/70 lg:text-lg">{course.summary}</p>
              <div className="mt-7 flex flex-wrap gap-5 text-sm font-bold text-white/70"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-accent" /> {course.durationHours} ساعة</span><span className="inline-flex items-center gap-2"><BookOpenCheck className="h-4 w-4 text-accent" /> {lessonCount || "منهج قيد الإعداد"}</span><span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-accent" /> شهادة رقمية</span></div>
            </div>
            <div className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-2xl">
              {image ? <Image src={image} alt={`غلاف دورة ${course.title}`} fill priority sizes="(max-width: 1024px) 100vw, 42vw" className="object-cover" /> : <div className="absolute inset-0 grid place-items-center"><BookOpenCheck className="h-16 w-16 text-white/20" /></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-secondary/45 to-transparent" />
            </div>
          </div>
        </Container>
      </section>

      <section className="section-shell">
        <Container className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
          <div className="space-y-10">
            <section aria-labelledby="course-about"><h2 id="course-about" className="text-2xl font-black text-secondary">عن البرنامج</h2><p className="mt-4 whitespace-pre-line leading-8 text-muted-foreground">{course.description || course.summary}</p></section>
            <section aria-labelledby="course-benefits"><h2 id="course-benefits" className="text-2xl font-black text-secondary">ما الذي تحصل عليه؟</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{["وصول منظم إلى محتوى البرنامج", "متابعة واضحة للتقدم والإنجاز", "اختبار نهائي وفق متطلبات البرنامج", "شهادة إلكترونية قابلة للتحقق"].map((benefit) => <div key={benefit} className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 text-sm font-bold text-secondary"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-light text-primary-dark"><Check className="h-4 w-4" /></span>{benefit}</div>)}</div></section>
            <section aria-labelledby="outline"><div className="flex items-center justify-between gap-4"><div><h2 id="outline" className="text-2xl font-black text-secondary">محتوى البرنامج</h2><p className="mt-2 text-sm text-muted-foreground">تعرف على الوحدات والدروس قبل التسجيل.</p></div>{lessonCount > 0 && <span className="rounded-full bg-surface-soft px-3 py-1.5 text-xs font-bold text-muted-foreground">{lessonCount} درس</span>}</div>
              {outline && outline.sections.length > 0 ? <ol className="mt-5 space-y-3">{outline.sections.map((section, index) => <li key={section.id} className="card overflow-hidden"><div className="flex items-center gap-3 border-b border-border bg-surface-soft px-5 py-4"><span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-xs font-black text-white">{index + 1}</span><h3 className="font-black text-secondary">{section.title}</h3></div><ul className="divide-y divide-border">{section.lessons.map((lesson) => <li key={lesson.id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm"><span className="font-bold text-foreground">{lesson.title}</span><span className="inline-flex shrink-0 items-center gap-2 text-xs text-muted-foreground">{lesson.isFreePreview ? <span className="rounded-full bg-primary-light px-2 py-1 font-bold text-primary-dark">معاينة مجانية</span> : <LockKeyhole className="h-3.5 w-3.5" />}</span></li>)}</ul></li>)}</ol> : <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-6"><p className="font-black text-amber-900">المنهج قيد الإعداد للنشر</p><p className="mt-2 text-sm leading-7 text-amber-800">نعمل على مراجعة وحدات هذا البرنامج قبل فتح التسجيل لضمان تجربة تعليمية مكتملة.</p></div>}
            </section>
          </div>

          <aside className="card sticky top-28 p-6 shadow-md">
            <p className="text-sm font-bold text-muted-foreground">رسوم البرنامج</p><p className="mt-1 text-3xl font-black text-secondary">{formatPrice(course.priceAmount, course.currency)}</p>
            <div className="my-6 h-px bg-border" />
            <ul className="space-y-4 text-sm"><li className="flex justify-between"><span className="text-muted-foreground">المستوى</span><span className="font-bold text-secondary"><LevelBadge level={course.level} /></span></li><li className="flex justify-between"><span className="text-muted-foreground">اللغة</span><span className="font-bold text-secondary">العربية</span></li><li className="flex justify-between"><span className="text-muted-foreground">الشهادة</span><span className="font-bold text-secondary">متاحة بعد النجاح</span></li></ul>
            {readyForEnrollment ? <a href={`https://learn.alameedtraining.com/courses/${course.slug}`} className="button button-primary mt-7 w-full">سجّل في البرنامج <ArrowLeft className="h-4 w-4" /></a> : <span className="mt-7 flex min-h-12 items-center justify-center rounded-xl bg-muted px-4 text-sm font-black text-muted-foreground">يفتح التسجيل بعد اكتمال المنهج</span>}
            <div className="mt-5 flex items-start gap-2 rounded-xl bg-surface-soft p-3 text-xs leading-6 text-muted-foreground"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-success" /> لن تُقبل أي دفعة قبل اكتمال محتوى البرنامج ونشره.</div>
          </aside>
        </Container>
      </section>

      <section className="border-t border-border bg-surface-soft py-10"><Container className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center"><div><h2 className="text-xl font-black text-secondary">هل تحتاج مساعدة قبل التسجيل؟</h2><p className="mt-1 text-sm text-muted-foreground">سيساعدك فريقنا في اختيار البرنامج المناسب.</p></div><ButtonLink href="/contact" variant="secondary">تواصل مع الفريق <ArrowLeft className="h-4 w-4" /></ButtonLink></Container></section>
    </>
  );
}
