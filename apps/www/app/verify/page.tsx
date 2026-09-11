import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CalendarDays, GraduationCap, Hash, Search, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { Container, PageHero } from "@/components/ui";

export const metadata: Metadata = {
  title: "التحقق من الشهادات",
  description: "تحقق من صحة شهادة صادرة عن مركز العميد للتدريب المتقدم باستخدام رقمها التسلسلي.",
};

type SearchParams = Promise<{ serial?: string }>;
const API_PUB = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

type CertInfo = { serialNumber: string; studentName: string; courseTitle: string; finalScore: number; issuedAt: string; valid: boolean };

async function verify(serial: string): Promise<{ result: CertInfo | null; unavailable: boolean }> {
  try {
    const response = await fetch(`${API_PUB}/public/certificates/${encodeURIComponent(serial)}`, { next: { revalidate: 300 } });
    if (response.status === 404) return { result: null, unavailable: false };
    if (!response.ok) return { result: null, unavailable: true };
    return { result: (await response.json()) as CertInfo, unavailable: false };
  } catch {
    return { result: null, unavailable: true };
  }
}

export default async function VerifyPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const serial = (sp.serial ?? "").trim();
  const verification = serial ? await verify(serial) : { result: null, unavailable: false };

  return (
    <>
      <PageHero eyebrow="توثيق رقمي" title="تحقق من صحة الشهادة في ثوانٍ" description="أدخل الرقم التسلسلي المدوّن على الشهادة لعرض بياناتها الرسمية مباشرة من سجل المركز." />
      <section className="section-shell pt-8 md:pt-12">
        <Container className="max-w-3xl">
          <form method="GET" role="search" className="card flex flex-col gap-3 p-3 shadow-md sm:flex-row">
            <label className="relative flex-1"><span className="sr-only">الرقم التسلسلي للشهادة</span><Hash className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" /><input name="serial" defaultValue={serial} dir="ltr" required placeholder="ALD-2026-XXXXXXXX" className="form-control pr-12 font-mono uppercase" /></label>
            <button type="submit" className="button button-primary sm:min-w-32"><Search className="h-4 w-4" /> تحقق</button>
          </form>
          <div className="mt-4 flex items-start gap-2 px-2 text-xs leading-6 text-muted-foreground"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-success" /> لا نعرض أي بيانات إضافية عن المتدرب، وتستخدم الصفحة للتحقق من صحة الشهادة فقط.</div>

          {serial && verification.unavailable && <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center" role="alert"><p className="font-black text-amber-900">خدمة التحقق غير متاحة مؤقتاً</p><p className="mt-2 text-sm text-amber-800">يرجى المحاولة بعد قليل أو التواصل مع المركز.</p></div>}

          {serial && !verification.unavailable && verification.result && (
            <article className="mt-8 overflow-hidden rounded-[1.5rem] border border-emerald-200 bg-white shadow-md">
              <div className="flex items-center gap-4 bg-emerald-50 p-6"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600 text-white"><BadgeCheck className="h-8 w-8" /></span><div><p className="text-xs font-bold text-emerald-700">نتيجة التحقق</p><h2 className="mt-1 text-xl font-black text-emerald-950">شهادة صحيحة ومسجلة</h2></div></div>
              <dl className="grid gap-px bg-border sm:grid-cols-2">
                <div className="bg-white p-5"><dt className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><UserRound className="h-4 w-4 text-primary" /> اسم المتدرب</dt><dd className="mt-2 font-black text-secondary">{verification.result.studentName}</dd></div>
                <div className="bg-white p-5"><dt className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><GraduationCap className="h-4 w-4 text-primary" /> البرنامج</dt><dd className="mt-2 font-black text-secondary">{verification.result.courseTitle}</dd></div>
                <div className="bg-white p-5"><dt className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><BadgeCheck className="h-4 w-4 text-primary" /> النتيجة</dt><dd className="mt-2 font-black text-secondary">{verification.result.finalScore}%</dd></div>
                <div className="bg-white p-5"><dt className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary" /> تاريخ الإصدار</dt><dd className="mt-2 font-black text-secondary">{new Date(verification.result.issuedAt).toLocaleDateString("ar-EG", { dateStyle: "long" })}</dd></div>
              </dl>
              <p className="border-t border-border bg-surface-soft px-6 py-4 text-center text-xs text-muted-foreground">الرقم التسلسلي: <span dir="ltr" className="font-mono font-bold text-secondary">{verification.result.serialNumber}</span></p>
            </article>
          )}

          {serial && !verification.unavailable && !verification.result && <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center" role="alert"><XCircle className="mx-auto h-10 w-10 text-red-600" /><h2 className="mt-3 font-black text-red-900">لم نعثر على شهادة بهذا الرقم</h2><p className="mt-2 text-sm leading-7 text-red-700">تأكد من كتابة الرقم كما يظهر على الشهادة. إذا استمرت المشكلة، <Link href="/contact" className="font-black underline">تواصل معنا</Link>.</p></div>}
        </Container>
      </section>
    </>
  );
}
