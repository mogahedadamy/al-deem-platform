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

export function LessonPlayer({ enrollmentId, lessons }: { enrollmentId: string; lessons: LessonItem[] }) {
  const [activeId, setActiveId] = useState(lessons[0]?.lessonId ?? "");
  const [content, setContent] = useState<LessonContent | null>(null);
  const [viewed, setViewed] = useState<Set<string>>(
    new Set(lessons.filter((lesson) => lesson.viewed).map((lesson) => lesson.lessonId)),
  );
  const [loading, setLoading] = useState(Boolean(activeId));
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [activeId, enrollmentId]);

  function selectLesson(id: string) {
    if (id === activeId) return;
    setLoading(true);
    setError(null);
    setContent(null);
    setActiveId(id);
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
    return true;
  }

  async function completeAndNext() {
    if (!(await completeCurrent())) return;
    const index = lessons.findIndex((lesson) => lesson.lessonId === activeId);
    if (index >= 0 && index < lessons.length - 1) selectLesson(lessons[index + 1].lessonId);
  }

  const allViewed = lessons.length > 0 && viewed.size === lessons.length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {loading ? (
            <div className="flex aspect-video items-center justify-center text-muted">جارٍ التحميل…</div>
          ) : error ? (
            <div className="flex aspect-video items-center justify-center px-6 text-center text-red-700" role="alert">{error}</div>
          ) : content?.type === "video" && content.videoUrl ? (
            <video
              key={content.lessonId}
              controls
              preload="metadata"
              playsInline
              className="aspect-video w-full bg-black"
              onEnded={() => void completeAndNext()}
            >
              <source src={content.videoUrl} />
              متصفحك لا يدعم تشغيل الفيديو.
            </video>
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
            <button onClick={() => void completeAndNext()} disabled={completing} className="mt-5 rounded-full bg-secondary px-6 py-2.5 font-semibold text-white disabled:opacity-60">
              {completing ? "جارٍ حفظ التقدم…" : "أكملت قراءة الدرس"}
            </button>
          )}
          {allViewed && (
            <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              ✓ أكملت كل دروس الدورة — <a href="/certificates" className="underline">شهاداتك</a> تصدر بعد اجتياز الاختبار.
            </p>
          )}
        </div>
      </div>

      <aside>
        <div className="sticky top-6 rounded-xl border border-border bg-surface">
          <h3 className="border-b border-border px-4 py-3 font-bold text-secondary">الدروس ({lessons.length})</h3>
          <ol className="max-h-[60vh] divide-y divide-border overflow-y-auto">
            {lessons.map((lesson, index) => {
              const active = lesson.lessonId === activeId;
              const complete = viewed.has(lesson.lessonId);
              return (
                <li key={lesson.lessonId}>
                  <button onClick={() => selectLesson(lesson.lessonId)} className={`flex min-h-12 w-full items-center gap-3 px-4 py-3 text-right text-sm transition-colors ${active ? "bg-secondary/5" : "hover:bg-secondary/[.03]"}`}>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${complete ? "bg-emerald-600 text-white" : "bg-border text-muted"}`} aria-hidden>{complete ? "✓" : index + 1}</span>
                    <span className={`flex-1 ${active ? "font-bold text-secondary" : "text-foreground/80"}`}>{lesson.title}</span>
                    {lesson.type === "video" && <span className="text-xs text-muted" aria-label="درس فيديو">▶</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </aside>
    </div>
  );
}
