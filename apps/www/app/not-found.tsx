// 404 عربية — صفحة الخطأ للموقع العام.
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-6xl font-black text-primary">٤٠٤</p>
        <h1 className="mt-6 text-2xl font-black text-secondary md:text-3xl">
          الصفحة غير موجودة
        </h1>
        <p className="mt-3 max-w-md leading-8 text-muted">
          الرابط الذي طلبته غير متاح أو تم نقله. يمكنك العودة للرئيسية أو
          تصفّح الدورات.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="flex h-12 items-center justify-center rounded-full bg-secondary px-8 font-semibold text-secondary-foreground transition-transform hover:scale-105"
          >
            الصفحة الرئيسية
          </Link>
          <Link
            href="/courses"
            className="flex h-12 items-center justify-center rounded-full border border-border px-8 font-semibold text-secondary transition-colors hover:border-primary hover:text-primary"
          >
            تصفّح الدورات
          </Link>
        </div>
      </main>
    </div>
  );
}
