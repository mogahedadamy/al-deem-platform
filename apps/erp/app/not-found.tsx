// 404 عربية — النظام الإداري.
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-6xl font-black text-primary">٤٠٤</p>
      <h1 className="mt-6 text-2xl font-black text-secondary md:text-3xl">
        الصفحة غير موجودة
      </h1>
      <p className="mt-3 max-w-md leading-8 text-muted">
        الرابط غير متاح في النظام الإداري — عُد للرئيسية.
      </p>
      <Link
        href="/"
        className="mt-8 flex h-12 items-center justify-center rounded-full bg-secondary px-8 font-semibold text-secondary-foreground"
      >
        الرئيسية
      </Link>
    </main>
  );
}
