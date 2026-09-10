// مشغل دروس الدورة — اختيار درس، فيديو/نص، تسجيل مشاهدة تلقائي عند التشغيل.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

export function LessonPlayer({
  enrollmentId,
  lessons,
}: {
  enrollmentId: string;
  lessons: LessonItem[];
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(lessons[0]?.lessonId ?? "");
  const [content, setContent] = useState<LessonContent | null>(null);
  const [viewed, setViewed] = useState<Set<string>>(
    new Set(lessons.filter((l) => l.viewed).map((l) => l.lessonId)),
  );
  const [loading, setLoading] = useState(false);
  const markedRef = useRef<string | null>(null);

  // جلب محتوى الدرس عند اختياره
  const load = useCallback(
    async (id: string) => {
      setLoading(true);
      const res = await fetch(
        `/api/lessons/view?enrollmentId=${encodeURIComponent(enrollmentId)}&lessonId=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      setLoading(false);
      if (!res.ok) return;
      const d = (await res.json()) as LessonContent;
      setContent(d);
      // المشاهدة تُسجَّل خادميًا في نفس الطلب — حدّث الحالة
      setViewed((prev) => new Set(prev).add(id));
    },
    [enrollmentId],
  );

  useEffect(() => {
    if (activeId) void load(activeId);
  }, [activeId, load]);

  // فتح الدرس التالي عند انتهاء الفيديو
  function next() {
    const idx = lessons.findIndex((l) => l.lessonId === activeId);
    if (idx >= 0 && idx < lessons.length - 1) {
      setActiveId(lessons[idx + 1].lessonId);
    }
  }

  // رابط الاختبار إن كان الدرس السابق مكتملاً — نتركها لصفحة أخرى
  const allViewed = viewed.size === lessons.length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      {/* المحتوى */}
      <div>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {loading && !content ? (
            <div className="flex aspect-video items-center justify-center text-muted">
              جارٍ التحميل…
            </div>
          ) : content?.type === "video" && content.videoUrl ? (
            <video
              key={content.lessonId}
              controls
              preload="metadata"
              playsInline
              className="aspect-video w-full bg-black"
              onEnded={next}
              onPlay={() => {
                // أول تشغيل = مشاهدة (الخادم سجّلها فعلًا عند الجلب)
                if (markedRef.current !== content.lessonId) {
                  markedRef.current = content.lessonId;
                }
              }}
            >
              <source src={content.videoUrl} />
              متصفحك لا يدعم تشغيل الفيديو.
            </video>
          ) : (
            <div className="flex aspect-video items-center justify-center bg-secondary/5 text-muted">
              درس نصي — المحتوى بالأسفل
            </div>
          )}
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-bold text-secondary">
            {content?.title ?? "اختر درسًا"}
          </h2>
          {content?.type !== "video" && content?.content && (
            <article className="mt-3 whitespace-pre-wrap leading-8 text-foreground/90">
              {content.content}
            </article>
          )}
          {allViewed && (
            <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              ✓ أكملت كل دروس الدورة —{" "}
              <a href="/certificates" className="underline">
                شهاداتك
              </a>{" "}
              تصدر بعد اجتياز الاختبار (70% فأكثر).
            </p>
          )}
        </div>
      </div>

      {/* قائمة الدروس */}
      <aside>
        <div className="sticky top-6 rounded-xl border border-border bg-surface">
          <h3 className="border-b border-border px-4 py-3 font-bold text-secondary">
            الدروس ({lessons.length})
          </h3>
          <ol className="max-h-[60vh] divide-y divide-border overflow-y-auto">
            {lessons.map((l, i) => {
              const isActive = l.lessonId === activeId;
              const isViewed = viewed.has(l.lessonId);
              return (
                <li key={l.lessonId}>
                  <button
                    onClick={() => setActiveId(l.lessonId)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-right text-sm transition-colors ${
                      isActive ? "bg-secondary/5" : "hover:bg-secondary/[.03]"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isViewed
                          ? "bg-emerald-600 text-white"
                          : "bg-border text-muted"
                      }`}
                      aria-hidden
                    >
                      {isViewed ? "✓" : i + 1}
                    </span>
                    <span
                      className={`flex-1 ${
                        isActive ? "font-bold text-secondary" : "text-foreground/80"
                      }`}
                    >
                      {l.title}
                    </span>
                    {l.type === "video" && (
                      <span className="text-xs text-muted" aria-label="درس فيديو">
                        ▶
                      </span>
                    )}
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
