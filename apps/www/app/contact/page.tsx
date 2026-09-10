// تواصل معنا — معلومات الاتصال ونموذج استفسار (Blueprint 7.5 + R4-B leads & inquiries).
import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock, MessageCircle, Heart } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/chrome";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "تواصل معنا",
  description:
    "اسأل عن الدورات أو اطلب تدريبًا مؤسسيًا — فريق مركز الديم للتدريب في خدمتك.",
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />
      <div className="h-16 md:h-20" aria-hidden="true" />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-primary/10 bg-gradient-to-br from-muted/20 to-background">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-20 right-20 h-72 w-72 rounded-full bg-gradient-primary blur-3xl" />
            <div className="absolute bottom-10 left-20 h-80 w-80 rounded-full bg-gradient-accent blur-3xl" />
          </div>
          <div className="mx-auto max-w-5xl px-6 py-14 text-center md:py-18">
            <div className="mb-5 inline-flex animate-fade-in items-center gap-2 rounded-full bg-gradient-primary/10 px-5 py-2.5">
              <Heart className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">تواصل معنا</span>
            </div>
            <h1 className="animate-fade-in bg-gradient-primary bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
              نحن هنا لمساعدتك
            </h1>
            <p className="mx-auto mt-4 max-w-2xl animate-fade-in leading-8 text-muted-foreground">
              فريقنا جاهز للإجابة عن استفساراتك حول الدورات والتسجيل والتدريب
              المؤسسي
            </p>

            {/* بطاقات معلومات الاتصال الحقيقية */}
            <div className="mt-12 grid grid-cols-2 gap-4 text-right lg:grid-cols-4 lg:gap-6">
              {[
                { icon: Phone, title: "رقم الهاتف", details: "+249 123 456 789", desc: "متاح للمكالمات من 8 صباحاً إلى 5 مساءً", gradient: "from-primary to-secondary" },
                { icon: Mail, title: "البريد الإلكتروني", details: "info@alameedtraining.com", desc: "سنرد عليك خلال 24 ساعة", gradient: "from-secondary to-primary" },
                { icon: MapPin, title: "العنوان", details: "السودان - الخرطوم", desc: "المقر الرئيسي - جامعة السودان - شارع الجيلة", gradient: "from-primary to-accent" },
                { icon: Clock, title: "ساعات العمل", details: "السبت - الخميس", desc: "8:00 ص - 5:00 م", gradient: "from-accent to-secondary" },
              ].map((info) => (
                <div key={info.title} className="animate-fade-in rounded-2xl bg-gradient-card p-5 shadow-card transition-all duration-500 hover:scale-105 hover:shadow-elegant">
                  <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-r ${info.gradient} p-2.5 shadow-hover`}>
                    <info.icon className="h-5 w-5 text-white drop-shadow-sm" />
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-secondary">{info.title}</h3>
                  <p className="mb-1 text-base font-bold text-foreground" dir="auto">{info.details}</p>
                  <p className="text-xs leading-5 text-muted-foreground">{info.desc}</p>
                </div>
              ))}
            </div>

            <a
              href="https://wa.me/249123456789"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex animate-fade-in items-center gap-2 rounded-2xl bg-green-600 px-8 py-3.5 font-semibold text-white shadow-hover transition-all duration-300 hover:scale-105 hover:shadow-glow"
            >
              <MessageCircle className="h-5 w-5" />
              تواصل عبر واتساب
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 md:grid-cols-2">
            {/* معلومات الاتصال */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-surface p-6">
                <h2 className="text-lg font-black text-secondary">
                  بيانات التواصل
                </h2>
                <ul className="mt-4 space-y-4 text-sm">
                  <li className="flex items-start gap-3">
                    <span aria-hidden className="text-primary-dark">✉</span>
                    <div>
                      <p className="font-semibold text-secondary">البريد الإلكتروني</p>
                      <p className="mt-1 text-muted" dir="ltr">
                        info@alameedtraining.com
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span aria-hidden className="text-primary-dark">☏</span>
                    <div>
                      <p className="font-semibold text-secondary">الهاتف</p>
                      <p className="mt-1 text-muted" dir="ltr">
                        +249 123 456 789
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span aria-hidden className="text-primary-dark">◉</span>
                    <div>
                      <p className="font-semibold text-secondary">المقر الرئيسي</p>
                      <p className="mt-1 leading-6 text-muted">
                        الخرطوم — السودان
                        <br />
                        أيام العمل: الأحد – الخميس، 9 صباحًا – 5 مساءً
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6">
                <h2 className="text-lg font-black text-secondary">
                  التدريب المؤسسي
                </h2>
                <p className="mt-3 leading-7 text-muted">
                  نقدّم برامج مخصصة للمؤسسات والشركات — محتوى مصمم وفق
                  احتياجاتكم، مع تقارير حضور وتقييم للفرق. تواصل معنا عبر
                  البريد لتنسيق برنامج خاص.
                </p>
              </div>
            </div>

            {/* نموذج الاستفسار */}
            <ContactForm />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}