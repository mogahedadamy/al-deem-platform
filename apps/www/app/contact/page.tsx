import type { Metadata } from "next";
import { Clock3, Mail, MapPin, MessageCircle, Sparkles } from "lucide-react";
import { ButtonLink, Container, PageHero } from "@/components/ui";
import { SITE } from "@/lib/site-content";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "تواصل معنا",
  description: "اسأل عن الدورات أو اطلب برنامجاً تدريبياً لمؤسستك — فريق مركز العميد في خدمتك.",
};

const CONTACT_ITEMS = [
  { icon: Mail, title: "البريد الإلكتروني", value: SITE.email, href: `mailto:${SITE.email}` },
  { icon: MessageCircle, title: "الاستفسارات", value: "عبر النموذج المباشر", href: "#contact-form" },
  { icon: MapPin, title: "الموقع", value: SITE.location },
  { icon: Clock3, title: "ساعات العمل", value: SITE.workHours },
] as const;

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="نحن قريبون منك" title="تواصل مع فريق يفهم احتياجك" description="سواء كنت تبحث عن دورة مناسبة أو برنامج مخصص لمؤسستك، سنساعدك في الوصول إلى الخيار الصحيح.">
        <ButtonLink href="#contact-form" className="mt-7"><MessageCircle className="h-5 w-5" /> أرسل استفسارك</ButtonLink>
      </PageHero>

      <section className="section-shell">
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CONTACT_ITEMS.map((item) => (
              <article key={item.title} className="card p-5">
                <span className="icon-box"><item.icon className="h-5 w-5" /></span>
                <h2 className="mt-5 text-sm font-black text-secondary">{item.title}</h2>
                {"href" in item && item.href ? <a href={item.href} dir="auto" className="mt-2 block text-sm font-bold leading-7 text-muted-foreground hover:text-primary-dark">{item.value}</a> : <p className="mt-2 text-sm font-bold leading-7 text-muted-foreground">{item.value}</p>}
              </article>
            ))}
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
            <aside className="rounded-[1.5rem] bg-secondary p-6 text-white lg:p-8">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent/15 text-accent"><Sparkles className="h-6 w-6" /></span>
              <h2 className="mt-6 text-2xl font-black">تدريب مؤسسي مصمم لكم</h2>
              <p className="mt-4 text-sm leading-8 text-white/65">نصمم برامج للفرق والمؤسسات وفق فجوة المهارات والوقت المتاح، مع متابعة للحضور وتقييم واضح للنتائج.</p>
              <ul className="mt-6 space-y-3 text-sm font-bold text-white/80"><li>• تحليل الاحتياج التدريبي</li><li>• محتوى وجدول مرنان</li><li>• تقارير حضور وتقييم</li><li>• شهادات قابلة للتحقق</li></ul>
            </aside>
            <ContactForm />
          </div>
        </Container>
      </section>
    </>
  );
}
