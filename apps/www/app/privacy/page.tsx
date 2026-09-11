import type { Metadata } from "next";
import { Container, PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "سياسة الخصوصية", description: "سياسة خصوصية بيانات مستخدمي منصة مركز العميد." };

export default function PrivacyPage() {
  return (
    <><PageHero eyebrow="الخصوصية" title="بياناتك مسؤولية نحميها" description="توضح هذه الصفحة المبادئ العامة التي نتبعها عند جمع بياناتك واستخدامها أثناء التواصل والتسجيل والتعلم." />
    <section className="section-shell pt-10"><Container className="max-w-3xl"><div className="card space-y-8 p-6 leading-8 text-muted-foreground md:p-10">
      <section><h2 className="text-xl font-black text-secondary">البيانات التي نجمعها</h2><p className="mt-2">نجمع البيانات الضرورية لتقديم الخدمة، مثل الاسم ووسائل التواصل وبيانات التسجيل والتقدم وطلبات الدفع. لا نطلب معلومات لا ترتبط مباشرة بالخدمة.</p></section>
      <section><h2 className="text-xl font-black text-secondary">كيف نستخدم البيانات</h2><p className="mt-2">تستخدم البيانات لإدارة حسابك، وتقديم البرامج، ومراجعة التسجيلات، وإصدار الشهادات، والرد على الاستفسارات، وتحسين جودة الخدمة.</p></section>
      <section><h2 className="text-xl font-black text-secondary">الحماية والمشاركة</h2><p className="mt-2">نطبق ضوابط وصول وصلاحيات لحماية البيانات، ولا نشاركها مع طرف ثالث إلا بقدر ما يلزم لتشغيل الخدمة أو امتثالاً لالتزام قانوني.</p></section>
      <section><h2 className="text-xl font-black text-secondary">حقوقك</h2><p className="mt-2">يمكنك طلب تصحيح بياناتك أو الاستفسار عن استخدامها عبر صفحة التواصل. قد نحتفظ بالسجلات الأكاديمية والمالية للمدة اللازمة للالتزامات التشغيلية والقانونية.</p></section>
      <p className="border-t border-border pt-6 text-sm">آخر تحديث: سبتمبر 2026. تُراجع الصياغة القانونية النهائية قبل الإطلاق التجاري العام.</p>
    </div></Container></section></>
  );
}
