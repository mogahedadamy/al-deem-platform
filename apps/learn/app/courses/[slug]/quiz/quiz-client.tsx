// تنفيذ الاختبار — أسئلة من الخادم (بلا إجابات)، تقديم، نتيجة + شهادة.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Question = {
  id: string;
  question: string;
  options: { key: string; text: string }[];
};

type Quiz = { id: string; title: string; passScore: number; questions: Question[] };

type AttemptResult = {
  id: string;
  score: number;
  passed: boolean;
  certIssued: boolean;
};

export function QuizRunner({
  enrollmentId,
  courseSlug,
}: {
  enrollmentId: string;
  courseSlug: string;
}) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [noQuiz, setNoQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/quizzes/by-course/${encodeURIComponent(courseSlug)}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        setNoQuiz(true);
        return;
      }
      if (res.ok) setQuiz(await res.json());
    })();
  }, [courseSlug]);

  // كل الأسئلة مُجابة؟
  const allAnswered =
    quiz?.questions.every((q) => answers[q.id]) ?? false;

  async function submit() {
    if (!quiz || !allAnswered) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/quizzes/${quiz.id}/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId, answers }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(b?.message ?? "تعذر تقديم المحاولة");
      return;
    }
    setResult((await res.json()) as AttemptResult);
  }

  // شاشة النتيجة
  if (result) {
    return (
      <div
        className={`rounded-xl border p-8 text-center ${
          result.passed
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <p className="text-4xl font-black">{result.score}%</p>
        {result.passed ? (
          <>
            <p className="mt-3 text-lg font-bold text-emerald-800">
              ناجح — مبروك! 🎉
            </p>
            {result.certIssued && (
              <p className="mt-2 text-sm font-semibold text-emerald-800">
                صدرت شهادتك الرقمية تلقائيًا.
              </p>
            )}
            <Link
              href="/certificates"
              className="mt-6 inline-block rounded-full bg-secondary px-8 py-3 font-semibold text-secondary-foreground hover:opacity-90"
            >
              شهاداتي
            </Link>
          </>
        ) : (
          <>
            <p className="mt-3 text-lg font-bold text-amber-900">
              لم تجتز هذه المرة — النجاح من 70%
            </p>
            <p className="mt-2 text-sm text-amber-800">
              راجع الدروس وأعد المحاولة، لا حدّ للمحاولات.
            </p>
            <button
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
              className="mt-6 rounded-full bg-secondary px-8 py-3 font-semibold text-secondary-foreground hover:opacity-90"
            >
              إعادة المحاولة
            </button>
          </>
        )}
      </div>
    );
  }

  if (noQuiz) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
        <p className="font-semibold text-secondary">لا اختبار لهذه الدورة بعد</p>
        <p className="mt-1 text-sm text-muted">
          سيعلن المدرب عن موعد الاختبار النهائي.
        </p>
        <Link
          href={`/courses/${courseSlug}/learn`}
          className="mt-4 inline-block text-sm font-semibold text-primary-dark underline"
        >
          متابعة الدروس
        </Link>
      </div>
    );
  }

  if (!quiz) {
    return <p className="py-12 text-center text-muted">جارٍ التحميل…</p>;
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div>
      <ol className="space-y-6">
        {quiz.questions.map((q, qi) => (
          <li key={q.id} className="rounded-xl border border-border bg-surface p-5">
            <p className="font-bold text-secondary">
              {qi + 1}. {q.question}
            </p>
            <div className="mt-4 space-y-2">
              {q.options.map((o) => {
                const selected = answers[q.id] === o.key;
                return (
                  <label
                    key={o.key}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                      selected
                        ? "border-primary bg-primary/10 font-semibold"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={o.key}
                      checked={selected}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.key }))}
                      className="accent-[#D4AF37]"
                    />
                    {o.text}
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm text-muted">
          أجبت على {answeredCount} من {quiz.questions.length}
        </p>
        <button
          onClick={submit}
          disabled={!allAnswered || busy}
          className="rounded-full bg-secondary px-10 py-3 font-semibold text-secondary-foreground transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "جارٍ التصحيح…" : "تقديم الإجابات"}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted">
        التصحيح خادمي — النجاح من {quiz.passScore}%.
      </p>
    </div>
  );
}
