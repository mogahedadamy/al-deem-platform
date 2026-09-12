import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-page flex flex-1 items-center justify-center text-center">
      <div className="app-empty max-w-xl">
        <p className="text-5xl font-black text-primary">٤٠٤</p>
        <h1 className="mt-5 text-2xl font-black text-secondary sm:text-3xl">الصفحة غير موجودة</h1>
        <p className="mt-3 leading-8 text-muted">الرابط غير متاح في النظام الإداري — عُد إلى مساحة العمل الرئيسية.</p>
        <Link href="/" className="app-button app-button-primary mt-7 min-h-12">الرئيسية</Link>
      </div>
    </main>
  );
}
