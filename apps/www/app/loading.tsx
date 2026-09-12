export default function Loading() {
  return (
    <div className="section-shell" aria-busy="true" aria-live="polite">
      <div className="site-container animate-pulse">
        <div className="h-4 w-28 rounded-full bg-muted" />
        <div className="mt-5 h-12 w-3/4 max-w-xl rounded-2xl bg-muted" />
        <div className="mt-4 h-5 w-full max-w-2xl rounded-full bg-muted" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="card h-72 bg-surface-soft" />)}
        </div>
      </div>
      <span className="sr-only">جارٍ تحميل الصفحة</span>
    </div>
  );
}
