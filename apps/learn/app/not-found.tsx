import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-page flex flex-1 items-center justify-center text-center">
      <div className="app-empty max-w-xl">
        <p className="text-5xl font-black text-primary">٤٠٤</p>
        <h1 className="mt-5 text-2xl font-black text-secondary sm:text-3xl">الصفحة غير موجودة</h1>
        <p className="mt-3 leading-8 text-muted">الرابط غير متاح — عُد إلى لوحة التحكم أو تصفّح الدورات المتاحة.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/dashboard" className="app-button app-button-primary min-h-12">لوحة التحكم</Link>
          <a href="https://alameedtraining.com/courses" className="app-button app-button-outline min-h-12">تصفّح الدورات</a>
        </div>
      </div>
    </main>
  );
}
