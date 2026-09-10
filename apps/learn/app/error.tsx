// خطأ تشغيل — منصة التعلم.
"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-6xl font-black text-primary">عذراً</p>
      <h1 className="mt-6 text-2xl font-black text-secondary md:text-3xl">
        حدث خطأ غير متوقع
      </h1>
      <p className="mt-3 max-w-md leading-8 text-muted">
        حاول مرة أخرى، وإن استمر الخطأ فعد لاحقًا.
      </p>
      <button
        onClick={reset}
        className="mt-8 flex h-12 items-center justify-center rounded-full bg-secondary px-8 font-semibold text-secondary-foreground"
      >
        إعادة المحاولة
      </button>
    </main>
  );
}
