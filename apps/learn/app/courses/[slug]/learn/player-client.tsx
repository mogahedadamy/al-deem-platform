"use client";

import { useEffect, useState } from "react";


type LessonItem = {
  lessonId: string;
  title: string;
  type: string;
  viewed: boolean;
};

type LessonContent = {
  lessonId: string;
  title: string;
  type: string;
  content: string;
  videoUrl: string;
};

export function LessonPlayer({ enrollmentId, courseSlug, lessons }: { enrollmentId: string; courseSlug: string; lessons: LessonItem[] }) {
  const [activeId, setActiveId] = useState(lessons[0]?.lessonId ?? "");
  const [content, setContent] = useState<LessonContent | null>(null);
  const [viewed, setViewed] = useState<Set<string>>(
    new Set(lessons.filter((lesson) => lesson.viewed).map((lesson) => lesson.lessonId)),
  );
  const [loading, setLoading] = useState(Boolean(activeId));
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [indexOpen, setIndexOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    fetch(
      `/api/lessons/view?enrollmentId=${encodeURIComponent(enrollmentId)}&lessonId=${encodeURIComponent(activeId)}`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.message ?? "تعذر جلب الدرس");
        }
        return response.json() as Promise<LessonContent>;
      })
      .then((data) => {
        if (!cancelled) {
          setContent(data);
          setError(null);
        }
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(reason.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId, enrollmentId, reloadKey]);

  function selectLesson(id: string) {
    if (id === activeId) return;
    setLoading(true);
    setError(null);
    setFeedback(null);
    setContent(null);
    setActiveId(id);
    setIndexOpen(false);
  }

  async function completeCurrent() {
    if (!activeId || viewed.has(activeId) || completing) return true;
    setCompleting(true);
    setError(null);
    const response = await fetch("/api/lessons/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId, lessonId: activeId }),
    }).catch(() => null);
    setCompleting(false);
    if (!response?.ok) {
      const body = response ? await response.json().catch(() => ({})) : {};
      setError((body as { message?: string }).message ?? "تعذر حفظ التقدم");
      return false;
    }
    setViewed((previous) => new Set(previous).add(activeId));
    setFeedback("تم حفظ تقدمك في هذا الدرس.");
    return true;
  }

  async function completeAndNext() {
    if (!(await completeCurrent())) return;
    const index = lessons.findIndex((lesson) => lesson.lessonId === activeId);
    if (index >= 0 && index < lessons.length - 1) selectLesson(lessons[index + 1].lessonId);
  }

  const allViewed = lessons.length > 0 && viewed.size === lessons.length;
  const activeIndex = lessons.findIndex((lesson) => lesson.lessonId === activeId);
  const activeLesson = lessons[activeIndex];

  const lessonList = (
    <ol className="max-h-[60vh] divide-y divide-border overflow-y-auto">
      {lessons.map((lesson, index) => {
        const active = lesson.lessonId === activeId;
        const complete = viewed.has(lesson.lessonId);
        return (
          <li key={lesson.lessonId}>
            <button
              type="button"
              onClick={() => selectLesson(lesson.lessonId)}
              className={`flex min-h-12 w-full items-center gap-3 px-4 py-3 text-right text-sm transition-colors ${active ? "bg-secondary/5" : "hover:bg-secondary/[.03]"}`}
              aria-current={active ? "step" : undefined}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${complete ? "bg-emerald-600 text-white" : "bg-border text-muted"}`} aria-hidden="true">{complete ? "✓" : index + 1}</span>
              <span className={`flex-1 ${active ? "font-bold text-secondary" : "text-foreground/80"}`}>{lesson.title}</span>
              <span className="sr-only">{complete ? "مكتمل" : "غير مكتمل"}</span>
              {lesson.type === "video" && <span className="text-xs text-muted" aria-label="درس فيديو">▶</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div>
      <div className="mb-4 rounded-xl border border-border bg-surface lg:hidden">
        <button type="button" onClick={() => setIndexOpen((value) => !value)} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-right font-bold text-secondary" aria-expanded={indexOpen} aria-controls="mobile-lesson-index">
          <span className="min-w-0"><span className="block text-xs text-muted">فهرس الدروس · {activeIndex + 1} من {lessons.length}</span><span className="block truncate">{activeLesson?.title}</span></span>
          <span aria-hidden="true">{indexOpen ? "▲" : "▼"}</span>
        </button>
        {indexOpen && <div id="mobile-lesson-index" className="border-t border-border">{lessonList}</div>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {loading ? (
            <div className="flex aspect-video items-center justify-center text-muted">جارٍ التحميل…</div>
          ) : error ? (
            <div className="flex aspect-video flex-col items-center justify-center gap-4 px-6 text-center text-red-700" role="alert"><span>{error}</span><button type="button" onClick={() => { setLoading(true); setError(null); setReloadKey((key) => key + 1); }} className="app-button app-button-outline">إعادة المحاولة</button></div>
          ) : content?.type === "video" && content.videoUrl ? (
            <div>
              <video
                key={content.lessonId}
                controls
                preload="metadata"
                playsInline
                className="aspect-video w-full bg-black"
                onEnded={() => void completeAndNext()}
                onError={() => setError("تعذر تشغيل الفيديو من شبكة المحتوى. تحقق من اتصالك ثم أعد المحاولة.")}
              >
                <source src={content.videoUrl} />
                متصفحك لا يدعم تشغيل الفيديو.
              </video>
              <div className="border-t border-border bg-surface-soft px-4 py-2 text-xs text-muted">تعذّر التشغيل؟ <a href={content.videoUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-primary-dark underline">افتح الفيديو من مصدر CDN</a></div>
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center bg-secondary/5 text-muted">درس نصي — المحتوى بالأسفل</div>
          )}
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-bold text-secondary">{content?.title ?? "اختر درسًا"}</h2>
          {content?.type !== "video" && content?.content && (
            <article className="mt-3 whitespace-pre-wrap leading-8 text-foreground/90">{content.content}</article>
          )}
          {content?.type !== "video" && content && !viewed.has(content.lessonId) && (
            <button type="button" onClick={() => void completeAndNext()} disabled={completing} className="app-button app-button-primary mt-5">
              {completing ? "جارٍ حفظ التقدم…" : "أكملت قراءة الدرس"}
            </button>
          )}
          <p className="mt-3 min-h-6 text-sm text-success" role="status" aria-live="polite">{feedback}</p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5" aria-label="التنقل بين الدروس">
            <button type="button" disabled={activeIndex <= 0} onClick={() => selectLesson(lessons[activeIndex - 1].lessonId)} className="app-button app-button-outline disabled:cursor-not-allowed disabled:opacity-45">الدرس السابق</button>
            {activeIndex < lessons.length - 1 ? <button type="button" onClick={() => void completeAndNext()} disabled={completing} className="app-button app-button-primary">حفظ والدرس التالي</button> : <a href={`/courses/${courseSlug}/quiz`} className="app-button app-button-gold">الانتقال إلى الاختبار</a>}
          </div>
          {allViewed && (
            <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              ✓ أكملت كل دروس الدورة — <a href={`/courses/${courseSlug}/quiz`} className="underline">ابدأ الاختبار النهائي</a> لإصدار الشهادة بعد النجاح.
            </p>
          )}
        </div>
      </div>

        <aside className="hidden lg:block" aria-label="فهرس دروس الدورة">
        <div className="sticky top-24 rounded-xl border border-border bg-surface">
          <h3 className="border-b border-border px-4 py-3 font-bold text-secondary">الدروس ({lessons.length})</h3>
          {lessonList}
        </div>
      </aside>
      </div>
    </div>
  );
}
