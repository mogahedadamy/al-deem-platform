export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-3xl font-black text-white shadow-lg">
          دي
        </div>
        <h1 className="max-w-2xl text-4xl font-black leading-tight text-secondary md:text-5xl">
          منصة التعلم — مركز الديم للتدريب
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
          مساحة الطالب والمدرب: دوراتي، دروسي، تقدمي، الاختبارات، والشهادات.
          تسجيل الدخول عبر الحساب الموحد للمركز.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a
            href="/login"
            className="flex h-12 items-center justify-center rounded-full bg-gradient-to-l from-primary to-primary-dark px-8 font-semibold text-white shadow-md transition-transform hover:scale-105"
          >
            تسجيل الدخول
          </a>
          <a
            href="https://www.alameedtraining.com/courses"
            className="flex h-12 items-center justify-center rounded-full border border-border px-8 font-semibold text-secondary transition-colors hover:border-primary hover:text-primary"
          >
            تصفح الدورات
          </a>
        </div>
        <p className="mt-16 text-sm text-muted">
          R0 Foundation — ربط SSO والتطبيقات قيد التأسيس
        </p>
      </main>
    </div>
  );
}
