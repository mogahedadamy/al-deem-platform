"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-black text-red-700">تعذر إكمال الطلب</p>
      <h1 className="mt-3 text-3xl font-black text-secondary">حدث خطأ غير متوقع</h1>
      <p className="mt-3 max-w-md leading-7 text-muted">أعد المحاولة، وإن استمرت المشكلة تواصل مع مدير النظام واذكر وقت حدوثها.</p>
      <button onClick={reset} className="mt-7 min-h-12 rounded-xl bg-secondary px-8 font-bold text-white">إعادة المحاولة</button>
    </div>
  );
}
