import type { Metadata } from "next";
import { Container, PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "الشروط والأحكام", description: "الشروط العامة لاستخدام خدمات مركز العميد ومنصته التدريبية." };

export default function TermsPage() {
  return (
    <><PageHero eyebrow="الشروط" title="استخدام واضح وعادل للخدمة" description="تنظم هذه الشروط استخدام الموقع ومنصة التعلم والتسجيل في البرامج التدريبية." />
    <section className="section-shell pt-10"><Container className="max-w-3xl"><div className="card space-y-8 p-6 leading-8 text-muted-foreground md:p-10">
      <section><h2 className="text-xl font-black text-secondary">الحساب والتسجيل</h2><p className="mt-2">يلتزم المستخدم بتقديم بيانات صحيحة والمحافظة على سرية حسابه. تفعيل الدورة المدفوعة يتم بعد مراجعة طلب الدفع واعتماده.</p></section>
      <section><h2 className="text-xl font-black text-secondary">المحتوى التعليمي</h2><p className="mt-2">المحتوى مخصص للاستخدام الشخصي للمتدرب، ولا يجوز نسخه أو إعادة نشره أو مشاركة بيانات الوصول دون إذن مكتوب.</p></section>
      <section><h2 className="text-xl font-black text-secondary">الاختبارات والشهادات</h2><p className="mt-2">تُصدر الشهادة عند استيفاء متطلبات إكمال البرنامج والنجاح المحددة. يمكن للجهات التحقق من الشهادة باستخدام الرقم التسلسلي.</p></section>
      <section><h2 className="text-xl font-black text-secondary">التعديلات والاسترداد</h2><p className="mt-2">تحدد سياسة التأجيل أو الاسترداد وفق نوع البرنامج وحالته ووقت تقديم الطلب. يجب تأكيد السياسة المالية التفصيلية مع إدارة المركز قبل السداد.</p></section>
      <p className="border-t border-border pt-6 text-sm">آخر تحديث: سبتمبر 2026. تحتاج البنود المالية والقانونية النهائية إلى اعتماد إدارة المركز قبل الإطلاق التجاري العام.</p>
    </div></Container></section></>
  );
}
