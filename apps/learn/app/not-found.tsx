// 404 عربية — منصة التعلم.
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-6xl font-black text-primary">٤٠٤</p>
      <h1 className="mt-6 text-2xl font-black text-secondary md:text-3xl">
        الصفحة غير موجودة
      </h1>
      <p className="mt-3 max-w-md leading-8 text-muted">
        الرابط غير متاح — عُد إلى لوحة التحكم أو تصفّح الدورات.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/dashboard"
          className="flex h-12 items-center justify-center rounded-full bg-secondary px-8 font-semibold text-secondary-foreground"
        >
          لوحة التحكم
        </Link>
        <Link
          href="/"
          className="flex h-12 items-center justify-center rounded-full border border-border px-8 font-semibold text-secondary"
        >
          الدورات
        </Link>
      </div>
    </main>
  );
}
