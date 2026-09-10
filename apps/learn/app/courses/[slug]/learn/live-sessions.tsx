// حصص الدورة المباشرة — تُعرض في صفحة التعلّم للطالب المسجّل.
"use client";

import { useEffect, useState } from "react";

type LiveSession = {
  id: string;
  title: string;
  status: string;
  startsAt: string;
  durationMin: number;
  timezone: string;
  joinWindowMin: number;
  joinUrl?: string;
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "مجدولة",
  join_open: "نافذة الانضمام مفتوحة",
  live: "مباشرة الآن",
  ended: "انتهت",
  recording_processing: "جارٍ معالجة التسجيل",
  archived: "مؤرشفة",
  cancelled: "ملغاة",
};

const STATUS_STYLE: Record<string, string> = {
  live: "bg-red-600 text-white",
  join_open: "bg-emerald-600 text-white",
  scheduled: "border border-border text-muted",
  ended: "bg-surface text-muted",
};

// هل نافذة الانضمام مفتوحة الآن؟ (client clock — الخادم هو مصدر القرار)
function joinWindowOpen(s: LiveSession): boolean {
  const start = new Date(s.startsAt).getTime();
  const now = Date.now();
  const opensAt = start - s.joinWindowMin * 60_000;
  const endsAt = start + s.durationMin * 60_000;
  return now >= opensAt && now <= endsAt;
}

export function LiveSessionsList({ courseId }: { courseId: string }) {
  const [sessions, setSessions] = useState<LiveSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<{ id: string; url?: string } | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      const res = await fetch(
        `/api/courses/${encodeURIComponent(courseId)}/live-sessions`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const d = (await res.json()) as { items: LiveSession[] };
        setSessions(d.items);
      } else if (res.status !==  403) {
        setError("تعذر جلب الحصص المباشرة");
      }
    })();
  }, [courseId]);

  async function join(id: string) {
    setJoining(id);
    const res = await fetch(`/api/live-sessions/${encodeURIComponent(id)}/join`, {
      method: "POST",
    });
    setJoining(null);
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setJoinUrl({ id, url: d.joinUrl });
    } else {
      setError(d.message ?? "تعذر الانضمام");
    }
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }
  if (sessions === null) return null;
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted">
        لا حصص مباشرة مجدولة لهذه الدورة حاليًا.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((s) => {
        const canJoin =
          (s.status === "join_open" || s.status === "scheduled") &&
          joinWindowOpen(s);
        const active = s.status === "join_open" || s.status === "live";
        return (
          <div
            key={s.id}
            className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
              s.status === "live"
                ? "border-red-200 bg-red-50"
                : s.status === "join_open"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-border"
            }`}
          >
            <div>
              <p className="font-bold text-secondary">{s.title}</p>
              <p className="mt-1 text-xs text-muted">
                {new Date(s.startsAt).toLocaleString("ar-EG", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                · {s.durationMin} دقيقة
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  STATUS_STYLE[s.status] ?? "border border-border text-muted"
                }`}
              >
                {s.status === "live" && (
                  <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
                )}
                {STATUS_LABEL[s.status] ?? s.status}
              </span>
              {active && (
                <button
                  onClick={() => join(s.id)}
                  disabled={joining === s.id}
                  className="rounded-full bg-secondary px-5 py-2 text-sm font-bold text-secondary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {joining === s.id ? "…" : "انضم"}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {joinUrl && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          ✓ تم تسجيل حضورك
          {joinUrl.url && (
            <>
              {" — "}
              <a
                href={joinUrl.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline"
              >
                افتح الاجتماع ↗
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
