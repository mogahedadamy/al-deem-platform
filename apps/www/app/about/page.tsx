// عن المركز — بيانات حقيقية من الموقع المرجعي (رؤية/رسالة/قيم/فريق/اعتمادات).
import type { Metadata } from "next";
import Link from "next/link";
import {
  Eye,
  MessageSquare,
  Gem,
  BookOpen,
  Award,
  GraduationCap,
  Shield,
  Star,
  Heart,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/chrome";

export const metadata: Metadata = {
  title: "عن المركز",
  description:
    "تعرّف على مركز العميد للتدريب المتقدم — رؤيتنا ورسالتنا وقيمنا وفريقنا واعتماداتنا الرسمية.",
};

const PILLARS = [
  {
    icon: Eye,
    title: "رؤيتنا",
    description:
      "الإسهام الفاعل في تطوير المؤسسات وأفراد المجتمع، وذلك من خلال إكسابهم العديد من المهارات المتعددة كلٍ في مجال تخصصه والتي سوف تساهم بدورها في تغيير الاتجاهات نحو العمل بشكل أكثر إبداعا وتميزاً",
  },
  {
    icon: MessageSquare,
    title: "رسالتنا",
    description:
      "يتولى المركز تقدير الاحتياجات التدريبية للأفراد، ويعمل على توفيرها لهم من خلال البرامج التدريبية وورش العمل المتنوعة التي تتماشى مع الرؤية التدريبية الحديثة",
  },
  {
    icon: Gem,
    title: "قيمنا",
    description:
      "الجودة في الأداء، المصداقية في التعامل، والعمل بروح الفريق الواحد لتحقيق التميز",
  },
] as const;

const TEAM = [
  {
    name: "أ. معتز محجوب",
    title: "مدرب معتمد",
    specialization: "التطوير المهني",
    experience: "12+ سنة خبرة",
    icon: BookOpen,
  },
  {
    name: "م. عمر التهامي",
    title: "مدرب معتمد",
    specialization: "الهندسة والإدارة",
    experience: "10+ سنة خبرة",
    icon: Award,
  },
  {
    name: "د. أحمد موسى",
    title: "أستاذ إدارة الأعمال",
    specialization: "إدارة الأعمال الحديثة",
    experience: "14+ سنة خبرة",
    icon: GraduationCap,
  },
] as const;

const CREDENTIALS = [
  {
    title: "شهادة تسجيل المركز",
    description: "شهادة تسجيل المركز من وزارة العدل السودانية",
    image: "/brand/registration-cert.webp",
    type: "تسجيل رسمي",
  },
  {
    title: "ترخيص مركز التدريب",
    description: "ترخيص مزاولة المهنة من وزارة التنمية البشرية",
    image: "/brand/training-license.webp",
    type: "ترخيص معتمد",
  },
  {
    title: "نموذج شهادة الدورات",
    description: "شهادات معتمدة لجميع دوراتنا التدريبية",
    image: "/brand/cert-sample.webp",
    type: "شهادة معتمدة",
  },
  {
    title: "شهادة جامعية معتمدة",
    description: "شراكة مع جامعة السودان للعلوم والتكنولوجيا",
    image: "/brand/university-cert.webp",
    type: "اعتماد أكاديمي",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />
      <div className="h-16 md:h-20" aria-hidden="true" />

      <header className="relative overflow-hidden border-b border-primary/10 bg-gradient-to-br from-muted/20 to-background">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-20 h-72 w-72 rounded-full bg-gradient-primary blur-3xl" />
          <div className="absolute bottom-10 right-20 h-80 w-80 rounded-full bg-gradient-accent blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-6 py-14 text-center">
          <div className="mb-5 inline-flex animate-fade-in items-center gap-2 rounded-full bg-gradient-primary/10 px-5 py-2.5">
            <Star className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">عن المركز</span>
          </div>
          <h1 className="animate-fade-in bg-gradient-primary bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
            مركز العميد للتدريب المتقدم
          </h1>
          <p className="mx-auto mt-4 max-w-3xl animate-fade-in leading-8 text-muted-foreground">
            المركز الإلكترونى الأول في السودان — أكثر من 26000 متدرب تخرجوا من
            المركز في أكثر من 120 دورة تدريبية على مدار 10 سنوات خبرة
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-14">
        <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
          {PILLARS.map((p, i) => (
            <div
              key={p.title}
              className="animate-fade-in rounded-3xl bg-gradient-card p-8 shadow-card transition-all duration-500 hover:scale-105 hover:shadow-elegant"
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-hover">
                <p.icon className="h-7 w-7 text-white" />
              </div>
              <h2 className="mb-3 text-xl font-bold text-secondary">{p.title}</h2>
              <p className="leading-8 text-muted-foreground">{p.description}</p>
            </div>
          ))}
        </div>

        <section className="mt-20">
          <div className="mb-10 text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-gradient-primary/10 px-5 py-2.5">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">فريقنا</span>
            </div>
            <h2 className="bg-gradient-primary bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
              نخبة من المدربين المعتمدين
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
            {TEAM.map((t, i) => (
              <div
                key={t.name}
                className="animate-fade-in rounded-3xl bg-gradient-card p-8 text-center shadow-card transition-all duration-500 hover:scale-105 hover:shadow-elegant"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-secondary shadow-hover">
                  <t.icon className="h-10 w-10 text-white" />
                </div>
                <h3 className="mb-1 text-xl font-bold text-secondary">{t.name}</h3>
                <p className="mb-2 font-medium text-primary">{t.title}</p>
                <p className="mb-1 text-sm text-muted-foreground">{t.specialization}</p>
                <p className="text-sm font-semibold text-accent">{t.experience}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <div className="mb-10 text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-gradient-primary/10 px-5 py-2.5">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">اعتماداتنا</span>
            </div>
            <h2 className="bg-gradient-primary bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
              اعتمادات رسمية محلية ودولية
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {CREDENTIALS.map((c, i) => (
              <figure
                key={c.title}
                className="group animate-fade-in overflow-hidden rounded-2xl bg-gradient-card shadow-card transition-all duration-500 hover:scale-105 hover:shadow-elegant"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className="aspect-[3/4] overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.image}
                    alt={c.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <figcaption className="p-4 text-center">
                  <div className="mb-1 text-xs font-medium text-primary">{c.type}</div>
                  <div className="font-bold text-secondary">{c.title}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">
                    {c.description}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <div className="mt-20 rounded-3xl bg-gradient-card p-10 text-center shadow-card md:p-14">
          <h2 className="mb-4 text-2xl font-bold text-secondary md:text-3xl">
            جاهز لتطوير مهاراتك؟
          </h2>
          <p className="mx-auto mb-8 max-w-2xl leading-8 text-muted-foreground">
            انضم إلى آلاف المتدربين الذين طوّروا مساراتهم المهنية مع مركز العميد
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-10 py-3.5 font-semibold text-white shadow-elegant transition-all duration-300 hover:scale-105 hover:shadow-glow"
          >
            <Heart className="h-5 w-5" />
            تصفّح الدورات
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
