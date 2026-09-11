import type { Metadata } from "next";
import Image from "next/image";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { ButtonLink, Container, PageHero, SectionHeading } from "@/components/ui";
import { CREDENTIALS, PARTNERS, PILLARS, SITE, STATS, TEAM } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "عن المركز",
  description: `تعرّف على ${SITE.nameAr} ورؤيته وفريقه وشراكاته واعتماداته.`,
};

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="من نحن" title="مركز يبني القدرات ويحوّل المعرفة إلى أثر" description="نعمل مع الأفراد والمؤسسات لتقديم تدريب مهني واضح، عملي، ومرتبط باحتياجات سوق العمل." />

      <section className="section-shell">
        <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] shadow-elegant"><Image src="/brand/training-activity.png" alt="أنشطة وفعاليات مركز العميد" fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="scale-[1.25] object-cover object-bottom" /><div className="absolute inset-0 bg-gradient-to-t from-secondary/55 to-transparent" /></div>
          <div>
            <span className="section-kicker">قصتنا</span>
            <h2 className="text-3xl font-black leading-tight text-secondary lg:text-4xl">تدريب أقرب إلى الواقع وأكثر وضوحاً للمتعلم</h2>
            <p className="mt-5 leading-8 text-muted-foreground">بدأ المركز بهدف بسيط وواضح: جعل التدريب المتخصص متاحاً وعملياً، مع مسار يمكن للمتدرب متابعته وإثبات إنجازه. اليوم نجمع الخبرة التدريبية مع منصة رقمية تخدم الطالب والمدرب والمؤسسة.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">{["محتوى عملي", "مدربون متخصصون", "متابعة رقمية", "شهادات موثقة"].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl bg-surface-soft p-3 text-sm font-bold text-secondary"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary-light text-primary-dark"><Check className="h-3.5 w-3.5" /></span>{item}</div>)}</div>
          </div>
        </Container>
      </section>

      <section className="section-shell section-soft">
        <Container>
          <SectionHeading eyebrow="ما يقود عملنا" title="رؤية ورسالة وقيم تتحول إلى ممارسة" />
          <div className="grid gap-5 md:grid-cols-3">{PILLARS.map((pillar) => <article key={pillar.title} className="card card-interactive p-6 lg:p-8"><div className="icon-box"><pillar.icon className="h-6 w-6" /></div><h2 className="mt-6 text-xl font-black text-secondary">{pillar.title}</h2><p className="mt-3 text-sm leading-8 text-muted-foreground">{pillar.description}</p></article>)}</div>
        </Container>
      </section>

      <section className="border-y border-border bg-white"><Container className="grid grid-cols-2 divide-x-reverse divide-y divide-border sm:grid-cols-4 sm:divide-y-0">{STATS.map((stat) => <div key={stat.label} className="p-6 text-center"><strong className="text-2xl font-black text-secondary lg:text-3xl">{stat.value}</strong><p className="mt-1 text-sm font-bold text-foreground">{stat.label}</p></div>)}</Container></section>

      <section className="section-shell">
        <Container>
          <SectionHeading eyebrow="فريقنا" title="خبرات تجمع المعرفة بالتطبيق" description="مدربون بخبرات متنوعة يقودون البرامج بأسلوب عملي يركز على النتائج." />
          <div className="grid gap-5 md:grid-cols-3">{TEAM.map((member) => <article key={member.name} className="card card-interactive p-6 text-center lg:p-8"><div className="relative mx-auto h-32 w-32 overflow-hidden rounded-full border-4 border-primary-light bg-secondary-light shadow-md"><Image src={member.image} alt={`المدرب ${member.name}`} fill sizes="128px" className="object-cover object-top" /></div><span className="mt-5 block text-xs font-bold text-primary-dark">{member.experience}</span><h2 className="mt-2 text-xl font-black text-secondary">{member.name}</h2><p className="mt-1 font-bold">{member.role}</p><p className="mt-2 text-sm text-muted-foreground">{member.specialty}</p></article>)}</div>
        </Container>
      </section>

      <section className="section-shell section-soft">
        <Container>
          <SectionHeading eyebrow="شركاؤنا" title="علاقات ترفع جودة التجربة التدريبية" />
          <div className="grid gap-4 md:grid-cols-3">{PARTNERS.map((partner) => <article key={partner.name} className="card flex items-center gap-5 p-5"><div className="relative h-20 w-24 shrink-0"><Image src={partner.image} alt={`شعار ${partner.name}`} fill sizes="96px" className="object-contain" /></div><div><span className="text-xs font-bold text-primary-dark">{partner.label}</span><h2 className="mt-2 text-sm font-black leading-6 text-secondary">{partner.name}</h2></div></article>)}</div>
        </Container>
      </section>

      <section className="section-shell">
        <Container>
          <SectionHeading eyebrow="الاعتماد" title="وثائق واضحة تعزز الثقة" description="يمكنك الاطلاع على وثائق التسجيل والترخيص ونماذج الشهادات المعتمدة." />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{CREDENTIALS.map((credential) => <figure key={credential.title} className="card overflow-hidden"><div className="relative aspect-[4/5] bg-muted"><Image src={credential.src} alt={credential.title} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" /></div><figcaption className="p-4"><span className="text-xs font-bold text-primary-dark">{credential.label}</span><p className="mt-1 text-sm font-black text-secondary">{credential.title}</p></figcaption></figure>)}</div>
        </Container>
      </section>

      <section className="section-dark py-12"><Container className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2 text-accent"><Sparkles className="h-5 w-5" /><span className="text-sm font-black">ابدأ خطوتك القادمة</span></div><h2 className="mt-3 text-2xl font-black text-white">اختر برنامجك وابدأ التعلم بثقة</h2></div><ButtonLink href="/courses" variant="light">تصفح الدورات <ArrowLeft className="h-4 w-4" /></ButtonLink></Container></section>
    </>
  );
}
