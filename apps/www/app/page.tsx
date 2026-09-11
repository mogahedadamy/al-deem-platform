import Image from "next/image";
import {
  ArrowLeft,
  ArrowUpLeft,
  BadgeCheck,
  BookOpen,
  Check,
  ChevronLeft,
  CirclePlay,
  Headphones,
  MessageCircle,
  Quote,
  Sparkles,
} from "lucide-react";
import { CourseCard } from "@/components/catalog";
import { ButtonLink, Container, Eyebrow, SectionHeading } from "@/components/ui";
import { listCourses } from "@/lib/api";
import {
  CREDENTIALS,
  FAQS,
  JOURNEY,
  PARTNERS,
  PILLARS,
  SITE,
  STATS,
  TEAM,
  TRAINING_AREAS,
  TRAINING_PROGRAMS,
  TRUST_ITEMS,
  VALUE_PROPS,
} from "@/lib/site-content";

export const revalidate = 60;

export default async function HomePage() {
  let featuredCourses: Awaited<ReturnType<typeof listCourses>>["items"] = [];
  try {
    featuredCourses = (await listCourses({ page: 1, pageSize: 6 })).items.slice(0, 6);
  } catch {
    // الصفحة التسويقية تبقى متاحة حتى عند تعطل خدمة الكتالوج.
  }

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: SITE.nameAr,
    alternateName: SITE.nameEn,
    url: "https://alameedtraining.com",
    logo: "https://alameedtraining.com/brand/logo.webp",
    email: SITE.email,
    address: { "@type": "PostalAddress", addressLocality: "الخرطوم", addressCountry: "SD" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />

      <section className="relative isolate overflow-hidden bg-secondary text-white">
        <Image src="/brand/hero-bg.jpg" alt="" fill priority sizes="100vw" className="-z-20 object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(11,35,45,.97)_0%,rgba(11,35,45,.90)_46%,rgba(11,35,45,.52)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(235,132,43,.25),transparent_34%)]" />

        <Container className="grid min-h-[calc(100svh-4.5rem)] items-center gap-10 py-12 lg:min-h-[44rem] lg:grid-cols-[1.2fr_.8fr] lg:py-20">
          <div className="max-w-3xl animate-fade-in">
            <Eyebrow icon={Sparkles}>تعليم مهني مصمم لواقع العمل</Eyebrow>
            <h1 className="mt-6 text-[2.35rem] font-black leading-[1.25] tracking-[-.045em] text-white sm:text-5xl lg:text-[4.6rem]">
              المعرفة التي تبدأ بها،
              <span className="mt-1 block bg-gradient-to-l from-accent via-orange-300 to-primary-light bg-clip-text text-transparent">والأثر الذي تصنعه.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/75 sm:text-lg lg:text-xl lg:leading-9">
              برامج تدريبية عملية يقودها خبراء، ومنصة تعلم واضحة ترافقك من اختيار الدورة حتى شهادة قابلة للتحقق.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/courses" className="sm:min-w-44">
                استكشف الدورات <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/about" variant="light" className="sm:min-w-40">
                تعرّف على المركز
              </ButtonLink>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-white/70">
              {TRUST_ITEMS.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-accent" aria-hidden="true" /> {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative hidden min-h-[32rem] lg:block" aria-hidden="true">
            <div className="absolute left-2 top-5 w-[20rem] rounded-[2rem] border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-secondary"><CirclePlay className="h-6 w-6" /></span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">تعلّم مرن</span>
              </div>
              <p className="mt-12 text-sm text-white/60">رحلتك التعليمية</p>
              <p className="mt-2 text-2xl font-black">مسار واضح، خطوة بخطوة</p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-4/5 rounded-full bg-gradient-to-l from-accent to-primary" /></div>
              <div className="mt-3 flex justify-between text-xs text-white/55"><span>تعلم</span><span>اختبار</span><span>شهادة</span></div>
            </div>
            <div className="absolute bottom-8 right-0 w-64 rounded-[1.75rem] border border-white/15 bg-secondary/70 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300"><BadgeCheck className="h-6 w-6" /></span><div><p className="text-xs text-white/55">الشهادة</p><p className="font-black">موثقة وقابلة للتحقق</p></div></div>
            </div>
            <div className="absolute bottom-28 left-0 grid h-24 w-24 animate-float place-items-center rounded-[1.75rem] border border-white/15 bg-white/10 backdrop-blur-xl"><BookOpen className="h-10 w-10 text-accent" /></div>
          </div>
        </Container>
      </section>

      <section aria-label="أرقام المركز" className="relative z-10 -mt-px border-b border-border bg-white">
        <Container className="grid grid-cols-2 divide-x-reverse divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          {STATS.map((stat) => (
            <div key={stat.label} className="px-3 py-6 text-center sm:px-5 lg:py-8">
              <strong className="block text-2xl font-black text-secondary lg:text-3xl">{stat.value}</strong>
              <span className="mt-1 block text-sm font-bold text-foreground">{stat.label}</span>
              <span className="mt-1 hidden text-xs text-muted-foreground lg:block">{stat.detail}</span>
            </div>
          ))}
        </Container>
      </section>

      <section className="section-shell">
        <Container>
          <SectionHeading eyebrow="لماذا مركز العميد؟" title="تجربة تدريبية موثوقة من التسجيل إلى الإنجاز" description="صممنا التجربة حول ما يحتاجه المتدرب فعلاً: محتوى واضح، متابعة سهلة، وإثبات إنجاز موثوق." />
          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            {VALUE_PROPS.map((item) => (
              <article key={item.title} className="card card-interactive p-6 lg:p-8">
                <div className="icon-box"><item.icon className="h-6 w-6" /></div>
                <h3 className="mt-6 text-xl font-black text-secondary">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-shell section-soft overflow-hidden">
        <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative">
            <div className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-primary-light/45 blur-2xl" />
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] shadow-elegant">
              <Image src="/brand/training-activity.png" alt="جانب من أنشطة مركز العميد التدريبية" fill sizes="(max-width: 1024px) 100vw, 50vw" className="scale-[1.25] object-cover object-bottom" />
              <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 via-transparent to-transparent" />
              <div className="absolute bottom-5 right-5 left-5 rounded-2xl border border-white/20 bg-secondary/70 p-4 text-white backdrop-blur-md">
                <p className="text-sm font-black">تدريب يصنع فرقاً في الأداء</p>
                <p className="mt-1 text-xs text-white/65">معرفة قابلة للتطبيق في الدراسة والعمل والمؤسسات</p>
              </div>
            </div>
          </div>
          <div>
            <SectionHeading align="start" eyebrow="عن المركز" title="نبني المهارة، لا نكتفي بتقديم المعلومة" description="مؤسسة تدريبية سودانية تقدم برامج في التطوير الإداري والقيادي والمهني، بمنهج يربط المعرفة بالتطبيق ويمنح المتدرب مساراً واضحاً للتقدم." />
            <div className="space-y-4">
              {PILLARS.map((pillar) => (
                <div key={pillar.title} className="flex gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-light/55 text-primary-dark"><pillar.icon className="h-5 w-5" /></span>
                  <div><h3 className="font-black text-secondary">{pillar.title}</h3><p className="mt-1 text-sm leading-7 text-muted-foreground">{pillar.description}</p></div>
                </div>
              ))}
            </div>
            <ButtonLink href="/about" variant="ghost" className="mt-6">اكتشف قصة المركز <ArrowLeft className="h-4 w-4" /></ButtonLink>
          </div>
        </Container>
      </section>

      <section className="section-shell" id="courses">
        <Container>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading align="start" eyebrow="دورات مختارة" title="ابدأ بما يناسب هدفك اليوم" description="برامج متنوعة بمستويات واضحة وأسعار معلنة، مع إمكانية التعلم والمتابعة من حساب واحد." />
            <ButtonLink href="/courses" variant="ghost" className="mb-12 shrink-0">عرض كل الدورات <ArrowLeft className="h-4 w-4" /></ButtonLink>
          </div>
          {featuredCourses.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredCourses.map((course, index) => <CourseCard key={course.id} course={course} priority={index < 3} />)}
            </div>
          ) : (
            <div className="card border-dashed p-8 text-center text-muted-foreground">يجري تحديث قائمة الدورات. يمكنك فتح الكتالوج للاطلاع على المتاح.</div>
          )}
        </Container>
      </section>

      <section className="section-shell section-dark" id="training-plan">
        <Container>
          <SectionHeading eyebrow="مجالات التدريب" title={<span className="text-white">برامج تلائم الأفراد والمؤسسات</span>} description={<span className="text-white/65">خطة تدريبية مرنة تغطي احتياجات التطوير الإداري والمهني والتقني.</span>} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TRAINING_AREAS.map((area) => (
              <div key={area.title} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.06] p-5 transition-colors hover:bg-white/[.1]">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent"><area.icon className="h-6 w-6" /></span>
                <div><h3 className="font-black text-white">{area.title}</h3><p className="mt-1 text-xs text-white/50">{area.count}</p></div>
              </div>
            ))}
          </div>
          <div className="mt-10 grid gap-x-8 gap-y-3 rounded-[1.5rem] border border-white/10 bg-white/[.04] p-6 sm:grid-cols-2 lg:grid-cols-3 lg:p-8">
            {TRAINING_PROGRAMS.map((program) => (
              <div key={program} className="flex items-start gap-2.5 text-sm leading-6 text-white/70"><Check className="mt-1 h-4 w-4 shrink-0 text-accent" /><span>{program}</span></div>
            ))}
          </div>
          <div className="mt-8 text-center"><ButtonLink href="/contact" variant="light">اطلب برنامجاً لمؤسستك <ArrowUpLeft className="h-4 w-4" /></ButtonLink></div>
        </Container>
      </section>

      <section className="section-shell">
        <Container>
          <SectionHeading eyebrow="كيف تبدأ؟" title="رحلة واضحة بلا تعقيد" description="أربع خطوات تربط قرارك بالتعلم والإنجاز في تجربة رقمية واحدة." />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {JOURNEY.map((item) => (
              <li key={item.step} className="relative rounded-2xl border border-border bg-white p-6">
                <span className="absolute left-5 top-4 text-3xl font-black text-primary-light">{item.step}</span>
                <span className="icon-box"><item.icon className="h-6 w-6" /></span>
                <h3 className="mt-6 text-lg font-black text-secondary">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="section-shell section-soft" id="experts">
        <Container>
          <SectionHeading eyebrow="فريق الخبراء" title="خبرات أكاديمية ومهنية تقود التعلّم" description="نخبة من المدربين المتخصصين في الإدارة والهندسة والتطوير المهني." />
          <div className="grid gap-5 md:grid-cols-3">
            {TEAM.map((member) => (
              <article key={member.name} className="card card-interactive p-6 text-center lg:p-8">
                <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-full border-4 border-primary-light bg-secondary-light shadow-md"><Image src={member.image} alt={`المدرب ${member.name}`} fill sizes="112px" className="object-cover object-top" /></div>
                <span className="mt-5 block text-xs font-bold text-primary-dark">{member.experience}</span><h3 className="mt-2 text-xl font-black text-secondary">{member.name}</h3><p className="mt-1 font-bold text-foreground">{member.role}</p><p className="mt-2 text-sm text-muted-foreground">{member.specialty}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-shell">
        <Container>
          <SectionHeading eyebrow="شراكات واعتمادات" title="ثقة مبنية على توثيق وشراكات حقيقية" description="نعرض وثائق المركز وشراكاته بوضوح لتتمكن من اتخاذ قرارك بثقة." />
          <div className="grid gap-4 md:grid-cols-3">
            {PARTNERS.map((partner) => (
              <article key={partner.name} className="card flex min-h-40 items-center gap-5 p-5">
                <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-white"><Image src={partner.image} alt={`شعار ${partner.name}`} fill sizes="96px" className="object-contain p-2" /></div>
                <div><span className="text-xs font-bold text-primary-dark">{partner.label}</span><h3 className="mt-2 text-sm font-black leading-6 text-secondary">{partner.name}</h3></div>
              </article>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CREDENTIALS.map((credential) => (
              <figure key={credential.title} className="card overflow-hidden">
                <div className="relative aspect-[4/5] overflow-hidden bg-muted"><Image src={credential.src} alt={credential.title} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" /></div>
                <figcaption className="p-4"><span className="text-[.68rem] font-bold text-primary-dark">{credential.label}</span><p className="mt-1 text-sm font-black text-secondary">{credential.title}</p></figcaption>
              </figure>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-shell section-soft">
        <Container className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <Eyebrow icon={Headphones}>إجابات سريعة</Eyebrow>
            <h2 className="mt-5 text-3xl font-black leading-tight text-secondary lg:text-4xl">كل ما تحتاج معرفته قبل أن تبدأ</h2>
            <p className="mt-4 leading-8 text-muted-foreground">إذا لم تجد إجابتك، فريقنا جاهز لمساعدتك واختيار المسار الأنسب لك.</p>
            <ButtonLink href="/contact" variant="ghost" className="mt-6"><MessageCircle className="h-4 w-4" /> تواصل مع الفريق</ButtonLink>
          </div>
          <div className="space-y-3">
            {FAQS.map((item, index) => (
              <details key={item.question} className="group card px-5 py-4" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black text-secondary"><span>{item.question}</span><ChevronLeft className="h-5 w-5 shrink-0 text-primary transition-transform group-open:-rotate-90" /></summary>
                <p className="mt-3 border-t border-border pt-3 text-sm leading-7 text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden bg-primary py-14 text-white lg:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.2),transparent_30%)]" />
        <Container className="relative z-10 flex flex-col items-start justify-between gap-7 lg:flex-row lg:items-center">
          <div className="max-w-2xl"><Quote className="h-8 w-8 text-white/35" /><h2 className="mt-4 text-3xl font-black leading-tight lg:text-4xl">خطوتك التالية أقرب مما تتوقع</h2><p className="mt-3 leading-8 text-white/75">اختر دورتك، أو تحدث مع فريقنا لنساعدك في بناء مسار يناسب هدفك المهني.</p></div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row"><ButtonLink href="/courses" variant="light">تصفح الدورات <ArrowLeft className="h-4 w-4" /></ButtonLink><ButtonLink href="/contact" variant="ghost" className="border-white/25 text-white hover:bg-white/10">تحدث معنا</ButtonLink></div>
        </Container>
      </section>
    </>
  );
}
