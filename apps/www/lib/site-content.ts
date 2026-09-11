import {
  Award,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarDays,
  FileBadge,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Languages,
  Lightbulb,
  Presentation,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";

export const SITE = {
  nameAr: "مركز العميد للتدريب المتقدم",
  nameShort: "مركز العميد",
  nameEn: "Alameed Training Center",
  description:
    "مركز سوداني للتدريب المهني المتقدم يقدم برامج عملية، تعلماً مرناً، وشهادات قابلة للتحقق.",
  email: "info@alameedtraining.com",
  location: "الخرطوم، السودان",
  workHours: "السبت – الخميس، 8 صباحاً – 5 مساءً",
} as const;

export const NAV_ITEMS = [
  { href: "/", label: "الرئيسية" },
  { href: "/courses", label: "الدورات" },
  { href: "/about", label: "عن المركز" },
  { href: "/#experts", label: "الخبراء" },
  { href: "/#training-plan", label: "البرامج" },
  { href: "/contact", label: "تواصل معنا" },
] as const;

export const STATS = [
  { value: "+26 ألف", label: "متدرب ومتدربة", detail: "من مختلف التخصصات" },
  { value: "+120", label: "برنامجاً تدريبياً", detail: "في مجالات مهنية متنوعة" },
  { value: "+10", label: "سنوات من الخبرة", detail: "في التدريب والتطوير" },
  { value: "4", label: "اعتمادات موثقة", detail: "وشراكات أكاديمية" },
] as const;

export const VALUE_PROPS = [
  {
    icon: ShieldCheck,
    title: "اعتماد يمكنك التحقق منه",
    description: "شهادة إلكترونية برقم تسلسلي وصفحة تحقق عامة للجهات وأصحاب العمل.",
  },
  {
    icon: Presentation,
    title: "تعلّم عملي ومرن",
    description: "دروس مسجلة وحصص مباشرة عند توفرها، مع تقدم واضح من أول درس حتى الإكمال.",
  },
  {
    icon: HeartHandshake,
    title: "دعم بشري حقيقي",
    description: "فريق المركز يساعدك في اختيار البرنامج والتسجيل ومتابعة رحلتك التعليمية.",
  },
] as const;

export const PILLARS = [
  {
    icon: Target,
    title: "رؤيتنا",
    description:
      "الإسهام الفاعل في تطوير المؤسسات وأفراد المجتمع بإكسابهم مهارات عملية تغيّر اتجاهاتهم نحو عمل أكثر إبداعاً وتميزاً.",
  },
  {
    icon: Lightbulb,
    title: "رسالتنا",
    description:
      "تقدير الاحتياجات التدريبية وتقديم برامج وورش عمل مواكبة للرؤية الحديثة في التدريب والتطوير المهني.",
  },
  {
    icon: Sparkles,
    title: "قيمنا",
    description: "الجودة في الأداء، والمصداقية في التعامل، والعمل بروح الفريق لتحقيق أثر مستدام.",
  },
] as const;

export const TRAINING_AREAS = [
  { icon: BriefcaseBusiness, title: "الإدارة والقيادة", count: "برامج احترافية" },
  { icon: BarChart3, title: "الجودة والمشروعات", count: "تطبيقات عملية" },
  { icon: UsersRound, title: "الموارد البشرية", count: "تطوير فرق العمل" },
  { icon: ShieldCheck, title: "السلامة وإدارة المخاطر", count: "معايير مهنية" },
  { icon: Languages, title: "اللغات والمهارات", count: "من المبتدئ للمتقدم" },
  { icon: GraduationCap, title: "تدريب المدربين", count: "بناء خبرات تعليمية" },
] as const;

export const TRAINING_PROGRAMS = [
  "التخطيط الاستراتيجي وإعداد الخطط التنفيذية",
  "تدريب المدربين (TOT)",
  "إدارة الموارد البشرية",
  "التميز في القيادة الإدارية",
  "إدارة المشاريع الاحترافية (PMP)",
  "الصحة والسلامة المهنية",
  "إدارة المخاطر والأزمات",
  "العلاقات العامة",
  "برامج الجودة الشاملة",
  "المعايير الدولية ISO",
  "التحليل الإحصائي SPSS",
  "إدارة المخازن والمحاسبة المالية",
] as const;

export const JOURNEY = [
  { icon: BookOpenCheck, step: "01", title: "اختر برنامجك", description: "قارن البرامج والمستويات واختر ما يناسب هدفك." },
  { icon: FileBadge, step: "02", title: "أكمل تسجيلك", description: "سجل بحساب موحد وارفع بيانات الدفع بأمان." },
  { icon: CalendarDays, step: "03", title: "تعلّم وتقدّم", description: "تابع الدروس والحصص واختبر معرفتك خطوة بخطوة." },
  { icon: Award, step: "04", title: "احصل على شهادتك", description: "شهادة رقمية قابلة للتحقق بعد استيفاء المتطلبات." },
] as const;

export const TEAM = [
  {
    name: "أ. معتز محجوب",
    role: "مدرب معتمد",
    specialty: "التطوير المهني وإدارة الأعمال",
    experience: "+12 سنة خبرة",
    image: "/brand/team/moataz-mahjoub.png",
  },
  {
    name: "م. عمر التهامي",
    role: "مدرب معتمد",
    specialty: "الهندسة والإدارة",
    experience: "+10 سنوات خبرة",
    image: "/brand/team/omar-altuhami.png",
  },
  {
    name: "د. أحمد موسى",
    role: "أستاذ إدارة الأعمال",
    specialty: "إدارة الأعمال الحديثة",
    experience: "+14 سنة خبرة",
    image: "/brand/team/ahmed-mousa.png",
  },
] as const;

export const PARTNERS = [
  {
    name: "جامعة السودان للعلوم والتكنولوجيا",
    label: "شراكة أكاديمية",
    image: "/brand/partners/sust.png",
  },
  {
    name: "الأكاديمية الدولية البريطانية BIA",
    label: "شراكة دولية",
    image: "/brand/partners/bia.png",
  },
  {
    name: "مركز الابتكار العالمي GITC",
    label: "شراكة تقنية",
    image: "/brand/partners/gitc.png",
  },
] as const;

export const FAQS = [
  {
    question: "كيف أسجل في دورة؟",
    answer: "اختر الدورة المناسبة ثم انتقل إلى منصة التعلم، أنشئ حسابك وأكمل طلب التسجيل والدفع من صفحة الدورة.",
  },
  {
    question: "هل الشهادات قابلة للتحقق؟",
    answer: "نعم. كل شهادة إلكترونية صادرة من المنصة تحمل رقماً تسلسلياً يمكن التحقق منه من صفحة التحقق العامة.",
  },
  {
    question: "هل توجد حصص مباشرة؟",
    answer: "بعض البرامج تتضمن حصصاً مباشرة مجدولة، ويظهر ذلك بوضوح على بطاقة الدورة وصفحتها قبل التسجيل.",
  },
  {
    question: "هل يقدم المركز تدريباً للمؤسسات؟",
    answer: "نعم. يمكن تصميم برامج مخصصة للمؤسسات والفرق وفق الاحتياج مع تقارير حضور وتقييم.",
  },
] as const;

export const CREDENTIALS = [
  { src: "/brand/registration-cert.webp", title: "شهادة تسجيل المركز", label: "تسجيل رسمي" },
  { src: "/brand/training-license.webp", title: "ترخيص مركز التدريب", label: "ترخيص معتمد" },
  { src: "/brand/cert-sample.webp", title: "نموذج شهادة الدورات", label: "شهادة قابلة للتحقق" },
  { src: "/brand/university-cert.webp", title: "شهادة جامعية معتمدة", label: "اعتماد أكاديمي" },
] as const;

export const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "تسجيل وترخيص موثق" },
  { icon: Globe2, label: "شراكات محلية ودولية" },
  { icon: Award, label: "شهادات قابلة للتحقق" },
] as const;
