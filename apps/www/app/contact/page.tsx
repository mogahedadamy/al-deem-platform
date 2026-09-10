// تواصل معنا — معلومات الاتصال ونموذج استفسار (Blueprint 7.5 + R4-B leads & inquiries).
import type { Metadata } from "next";
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

      <main className="flex-1">
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-3xl px-6 py-14 text-center md:py-18">
            <h1 className="text-3xl font-black leading-[1.3] text-secondary md:text-4xl">
              تواصل معنا
            </h1>
            <p className="mt-4 text-lg leading-8 text-muted">
              فريقنا جاهز للإجابة عن استفساراتك حول الدورات والتسجيل
              والتدريب المؤسسي.
            </p>
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