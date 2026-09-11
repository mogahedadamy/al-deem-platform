import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Users,
  Award,
  Star,
  Zap,
  TrendingUp,
  Shield,
  CheckSquare,
  Settings,
  Heart,
  Phone,
  Mail,
  MapPin,
  Clock,
  GraduationCap,
  FileCheck,
} from "lucide-react";

const STATS = [
  {
    icon: Users,
    value: "26000",
    label: "متدرب تخرجوا من المركز",
    desc: "خريجون متميزون في مختلف المجالات التدريبية والمهنية",
    gradient: "from-primary to-accent",
  },
  {
    icon: BookOpen,
    value: "120+",
    label: "دورة تدريبية",
    desc: "أكثر من ١٢٠ دورة تدريبية في مختلف التخصصات",
    gradient: "from-secondary to-info",
  },
  {
    icon: Award,
    value: "10",
    label: "سنوات خبرة",
    desc: "خبرة عريقة في مجال التدريب والتطوير المهني",
    gradient: "from-success to-accent",
  },
];

const FEATURES = [
  {
    icon: Shield,
    title: "شهادات معتمدة",
    desc: "شهادات حضور وإنجاز معتمدة محلياً ودولياً",
  },
  {
    icon: Users,
    title: "فئات متنوعة",
    desc: "تدريب كادر المركز والأفراد والمؤسسات",
  },
  {
    icon: GraduationCap,
    title: "خطة سنوية شاملة",
    desc: "برامج تدريبية مجدولة بمعدل 4 برامج شهرياً",
  },
];

const PARTNERS = [
  {
    name: "جامعة السودان للعلوم والتكنولوجيا",
    desc: "شراكة أكاديمية لمنح شهادات معتمدة في التخصصات التقنية والإدارية",
  },
  {
    name: "الأكاديمية الدولية البريطانية (BIA)",
    desc: "شراكة دولية لتقديم برامج تدريبية معتمدة عالمياً حسب المعايير البريطانية",
  },
  {
    name: "مركز الابتكار - ماليزيا (GITC)",
    desc: "شراكة تقنية متقدمة في مجال الابتكار والتكنولوجيا الحديثة",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1">
      {/* ═══ Hero — خلفية حقيقية + عناصر عائمة + أزرار تدرجية (أسلوب المرجع) ═══ */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/brand/hero-bg.jpg)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
        </div>

        {/* عناصر عائمة زجاجية */}
        <div className="absolute top-20 right-10 animate-float opacity-70 max-lg:hidden">
          <div className="rounded-3xl border border-white/40 bg-white/30 p-6 shadow-2xl backdrop-blur-lg">
            <BookOpen className="h-12 w-12 text-primary drop-shadow-lg" />
          </div>
        </div>
        <div className="absolute top-40 left-16 animate-float opacity-70 max-lg:hidden" style={{ animationDelay: "1s" }}>
          <div className="rounded-3xl border border-white/40 bg-white/30 p-5 shadow-2xl backdrop-blur-lg">
            <Users className="h-10 w-10 text-accent drop-shadow-lg" />
          </div>
        </div>
        <div className="absolute bottom-40 left-40 animate-float opacity-70 max-xl:hidden" style={{ animationDelay: "2s" }}>
          <div className="rounded-3xl border border-white/40 bg-white/30 p-7 shadow-2xl backdrop-blur-lg">
            <Award className="h-11 w-11 text-primary drop-shadow-lg" />
          </div>
        </div>
        <div className="absolute bottom-60 left-10 animate-float opacity-60 max-lg:hidden" style={{ animationDelay: "1.5s" }}>
          <div className="rounded-full bg-gradient-primary p-4 shadow-xl">
            <Zap className="h-6 w-6 text-white" />
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-20 text-center">
          {/* شارة التصنيف */}
          <div className="mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/30 bg-white/15 px-8 py-3 shadow-2xl backdrop-blur-lg">
              <TrendingUp className="h-6 w-6 text-primary drop-shadow-sm" />
              <span className="text-base font-medium text-white md:text-lg">
                المركز الإلكترونى الأول فى السودان
              </span>
            </div>
          </div>

          <h1
            className="mb-8 animate-fade-in text-3xl font-bold leading-tight text-white drop-shadow-2xl md:text-6xl lg:text-7xl"
            style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
          >
            مركز{" "}
            <span className="bg-gradient-accent bg-clip-text text-transparent drop-shadow-2xl">
              العميد
            </span>{" "}
            للتدريب المتقدم
          </h1>

          <p
            className="mx-auto mb-12 max-w-4xl animate-fade-in text-lg font-light leading-relaxed text-white drop-shadow-lg md:text-2xl"
            style={{ animationDelay: "0.2s", textShadow: "1px 1px 3px rgba(0,0,0,0.8)" }}
          >
            نقدم دورات تدريبية متخصصة في التطوير الإداري والقيادي والتثقيفي مع فريق
            من الخبراء المعتمدين
          </p>

          <div
            className="flex animate-fade-in flex-col items-center justify-center gap-6 sm:flex-row"
            style={{ animationDelay: "0.4s" }}
          >
            <Link
              href="/courses"
              className="flex h-14 items-center justify-center rounded-2xl bg-gradient-primary px-12 text-lg font-semibold text-white shadow-elegant transition-all duration-300 hover:scale-105 hover:shadow-glow"
            >
              <ArrowLeft className="ml-3 h-6 w-6" />
              استكشف دوراتنا
            </Link>
            <Link
              href="/contact"
              className="flex h-14 items-center justify-center rounded-2xl border-2 border-white/40 bg-white/15 px-12 text-lg font-semibold text-white shadow-xl backdrop-blur-lg transition-all duration-300 hover:bg-white hover:text-secondary"
            >
              تواصل معنا
            </Link>
          </div>

          {/* بطاقات الإحصائيات الزجاجية */}
          <div className="mt-24 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12">
              {STATS.map((s) => (
                <div key={s.label} className="group relative overflow-hidden">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/30 to-white/10" />
                  <div className="relative rounded-3xl border border-white/40 bg-white/20 p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-3 hover:border-white/60 hover:bg-white/25 hover:shadow-2xl hover:shadow-white/30 lg:p-10">
                    <div className="mb-8 flex items-center justify-between">
                      <div
                        className={`flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${s.gradient} shadow-2xl`}
                      >
                        <s.icon className="h-11 w-11 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="mb-1 text-5xl font-bold text-white lg:text-6xl">
                          {s.value}
                        </div>
                        <div className="ml-auto h-1.5 w-16 rounded-full bg-gradient-to-r from-primary to-accent" />
                      </div>
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-white lg:text-2xl">
                      {s.label}
                    </h3>
                    <p className="text-sm leading-relaxed text-white/80 lg:text-base">
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ المزايا — كما في خطة التدريب المرجعية ═══ */}
      <section className="relative overflow-hidden border-b border-primary/10 py-16 md:py-24">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-40 left-32 h-80 w-80 rounded-full bg-gradient-primary blur-3xl" />
          <div className="absolute bottom-40 right-32 h-96 w-96 rounded-full bg-gradient-accent blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <div className="mb-5 inline-flex animate-fade-in items-center gap-2 rounded-full bg-gradient-primary/10 px-6 py-3">
              <CheckSquare className="h-5 w-5 text-primary" />
              <span className="text-base font-semibold text-primary">
                لماذا مركز العميد
              </span>
            </div>
            <h2 className="animate-fade-in bg-gradient-primary bg-clip-text text-3xl font-bold text-transparent md:text-5xl">
              برامج تدريبية متميزة
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="animate-fade-in rounded-3xl bg-gradient-card p-8 shadow-card transition-all duration-500 hover:scale-105 hover:shadow-elegant"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-hover">
                  <f.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-secondary transition-colors group-hover:text-primary">
                  {f.title}
                </h3>
                <p className="leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ الشراكات — بيانات حقيقية ═══ */}
      <section className="relative overflow-hidden border-b border-primary/10 bg-gradient-to-br from-muted/20 to-background py-16 md:py-24">
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <div className="mb-5 inline-flex animate-fade-in items-center gap-2 rounded-full bg-gradient-primary/10 px-6 py-3">
              <Star className="h-5 w-5 text-primary" />
              <span className="text-base font-semibold text-primary">
                شراكاتنا واعتماداتنا
              </span>
            </div>
            <h2 className="animate-fade-in bg-gradient-primary bg-clip-text text-3xl font-bold text-transparent md:text-5xl">
              اعتمادات محلية ودولية
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
            {PARTNERS.map((p, i) => (
              <div
                key={p.name}
                className="animate-fade-in rounded-3xl bg-gradient-card p-8 text-center shadow-card transition-all duration-500 hover:scale-105 hover:shadow-elegant"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-secondary shadow-hover">
                  <FileCheck className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-3 text-lg font-bold text-secondary">{p.name}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>

          {/* صور الاعتمادات الرسمية */}
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { src: "/brand/registration-cert.webp", title: "شهادة تسجيل المركز", desc: "من وزارة العدل السودانية" },
              { src: "/brand/training-license.webp", title: "ترخيص مركز التدريب", desc: "من وزارة التنمية البشرية" },
              { src: "/brand/cert-sample.webp", title: "نموذج شهادة الدورات", desc: "شهادات معتمدة لجميع الدورات" },
              { src: "/brand/university-cert.webp", title: "شهادة جامعية معتمدة", desc: "شراكة مع جامعة السودان" },
            ].map((c) => (
              <figure
                key={c.title}
                className="group animate-fade-in overflow-hidden rounded-2xl bg-gradient-card shadow-card transition-all duration-500 hover:scale-105 hover:shadow-elegant"
              >
                <div className="aspect-[3/4] overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.src}
                    alt={c.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <figcaption className="p-4 text-center">
                  <div className="font-bold text-secondary">{c.title}</div>
                  <div className="text-xs text-muted-foreground">{c.desc}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ دعوة أخيرة ═══ */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" style={{ backgroundImage: "url(/brand/hero-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center" }} />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-4 animate-fade-in text-3xl font-bold text-white md:text-5xl">
            ابدأ رحلتك التدريبية اليوم
          </h2>
          <p className="mb-10 animate-fade-in text-lg text-white/80 md:text-xl">
            انضم إلى آلاف المتدربين الذين طوّروا مهاراتهم معنا
          </p>
          <div className="flex animate-fade-in flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/courses"
              className="flex h-14 items-center justify-center rounded-2xl bg-gradient-primary px-10 text-lg font-semibold text-white shadow-elegant transition-all duration-300 hover:scale-105 hover:shadow-glow"
            >
              <Heart className="ml-2 h-5 w-5" />
              تصفّح الدورات
            </Link>
            <Link
              href="/contact"
              className="flex h-14 items-center justify-center rounded-2xl border-2 border-white/40 bg-white/15 px-10 text-lg font-semibold text-white backdrop-blur-lg transition-all duration-300 hover:bg-white hover:text-secondary"
            >
              تواصل معنا
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
