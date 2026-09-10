// خطأ تشغيل — واجهة عربية بديلة عن الافتراضية.
"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-6xl font-black text-primary">عذراً</p>
      <h1 className="mt-6 text-2xl font-black text-secondary md:text-3xl">
        حدث خطأ غير متوقع
      </h1>
      <p className="mt-3 max-w-md leading-8 text-muted">
        نعتذر عن الإزعاج — حاول مرة أخرى، وإن استمر الخطأ تواصل معنا.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="flex h-12 items-center justify-center rounded-full bg-secondary px-8 font-semibold text-secondary-foreground transition-transform hover:scale-105"
        >
          إعادة المحاولة
        </button>
        <a
          href="/contact"
          className="flex h-12 items-center justify-center rounded-full border border-border px-8 font-semibold text-secondary transition-colors hover:border-primary hover:text-primary"
        >
          تواصل معنا
        </a>
      </div>
    </div>
  );
}
