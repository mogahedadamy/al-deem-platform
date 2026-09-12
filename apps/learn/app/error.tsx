"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="app-page flex flex-1 items-center justify-center text-center">
      <div className="app-alert max-w-xl border-amber-200 bg-amber-50 text-amber-900">
        <p className="app-kicker">تعذر إكمال الطلب</p>
        <h1 className="mt-3 text-2xl font-black text-secondary sm:text-3xl">حدث خطأ غير متوقع</h1>
        <p className="mt-3 leading-8 text-muted">حاول مرة أخرى، وإن استمر الخطأ فعد لاحقًا أو تواصل مع فريق المركز.</p>
        <button type="button" onClick={reset} className="app-button app-button-primary mt-7 min-h-12">إعادة المحاولة</button>
      </div>
    </main>
  );
}
