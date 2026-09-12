export default function Loading() {
  return (
    <div className="app-page" aria-busy="true" aria-live="polite">
      <div className="app-page-header animate-pulse">
        <div className="h-3 w-24 rounded-full bg-border" />
        <div className="mt-4 h-9 w-2/5 max-w-sm rounded-xl bg-border" />
        <div className="mt-3 h-4 w-full max-w-xl rounded-full bg-border" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="app-card h-32 animate-pulse bg-surface-soft" />)}
      </div>
      <span className="sr-only">جارٍ تحميل البيانات</span>
    </div>
  );
}
