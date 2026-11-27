"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Course = { id: string; title: string; summary: string; description: string; status: string; level: string; priceAmount: number; durationHours: number; coverImageUrl: string | null; hasLiveSessions: boolean };
type Outline = { sections: { id: string; title: string; position: number; lessons: { id: string; title: string; type: string; position: number; isFreePreview: boolean; content?: string | null; videoUrl?: string | null }[] }[] };
type DraftQuestion = { question: string; options: string[]; correctIndex: number };

async function action(input: unknown) {
  const response = await fetch("/api/instructor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { message?: string }).message ?? "تعذر تنفيذ العملية");
  return body;
}

export function CourseBuilder({ course, outline }: { course: Course; outline: Outline }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const editable = course.status === "draft";
  const input = "mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-primary disabled:opacity-60";
  const lessons = outline.sections.flatMap((section) => section.lessons.map((lesson) => ({ ...lesson, sectionTitle: section.title })));
  const [quizTitle, setQuizTitle] = useState("الاختبار النهائي");
  const [quizLessonId, setQuizLessonId] = useState(lessons[0]?.id ?? "");
  const [questions, setQuestions] = useState<DraftQuestion[]>([{ question: "", options: ["", ""], correctIndex: 0 }]);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  async function run(work: () => Promise<unknown>, success: string) {
    setBusy(true); setError(null); setNotice(null);
    try { await work(); setNotice(success); router.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر تنفيذ العملية"); }
    finally { setBusy(false); }
  }

  async function updateCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    await run(() => action({ action: "update", courseId: course.id, payload: {
      title: String(data.get("title") ?? ""), summary: String(data.get("summary") ?? ""), description: String(data.get("description") ?? ""),
      level: String(data.get("level") ?? "beginner"), priceAmount: Number(data.get("priceAmount") ?? 0), durationHours: Number(data.get("durationHours") ?? 0),
      coverImageUrl: String(data.get("coverImageUrl") ?? "") || null, hasLiveSessions: data.get("hasLiveSessions") === "on",
    } }), "تم حفظ معلومات الدورة.");
  }

  async function addSection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    await run(() => action({ action: "section", courseId: course.id, payload: { title: String(data.get("title") ?? ""), position: outline.sections.length + 1 } }), "تمت إضافة القسم.");
    form.reset();
  }

  async function scheduleSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    await run(() => action({ action: "schedule", payload: {
      courseId: course.id, title: String(data.get("title") ?? ""), startsAt: new Date(String(data.get("startsAt"))).toISOString(),
      durationMin: Number(data.get("durationMin") ?? 60), joinWindowMin: 10, timezone: "Africa/Khartoum",
    } }), "تمت جدولة الحصة المباشرة.");
    form.reset();
  }

  async function updateSection(event: React.FormEvent<HTMLFormElement>, sectionId: string) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    await run(() => action({ action: "updateSection", courseId: course.id, sectionId, payload: { title: String(data.get("title") ?? "") } }), "تم حفظ اسم القسم.");
    setEditingSectionId(null);
  }

  async function updateLesson(event: React.FormEvent<HTMLFormElement>, lessonId: string, position: number) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const type = String(data.get("type") ?? "text");
    const videoUrl = type === "video" ? String(data.get("videoUrl") ?? "").trim() : "";
    if (type === "video" && !videoUrl.startsWith("https://")) { setError("رابط فيديو CDN يجب أن يبدأ بـ https://"); return; }
    await run(() => action({ action: "updateLesson", lessonId, payload: { title: String(data.get("title") ?? ""), type, content: String(data.get("content") ?? ""), videoUrl, position, isFreePreview: data.get("isFreePreview") === "on" } }), "تم حفظ الدرس ورابط المحتوى.");
    setEditingLessonId(null);
  }

  async function removeSection(sectionId: string) {
    if (!window.confirm("حذف القسم سيحذف دروسه أيضاً. هل تريد المتابعة؟")) return;
    await run(() => action({ action: "deleteSection", courseId: course.id, sectionId }), "تم حذف القسم ودروسه.");
  }

  async function removeLesson(lessonId: string) {
    if (!window.confirm("هل تريد حذف هذا الدرس؟")) return;
    await run(() => action({ action: "deleteLesson", lessonId }), "تم حذف الدرس.");
  }

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question, itemIndex) => itemIndex === index ? { ...question, ...patch } : question));
  }

  function updateOption(questionIndex: number, optionIndex: number, text: string) {
    setQuestions((current) => current.map((question, itemIndex) => {
      if (itemIndex !== questionIndex) return question;
      return { ...question, options: question.options.map((option, index) => index === optionIndex ? text : option) };
    }));
  }

  async function createQuiz(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quizLessonId) { setError("أضف درساً واحداً على الأقل ثم اختر الدرس المرتبط بالاختبار."); return; }
    const valid = questions.every((question) => question.question.trim() && question.options.filter((option) => option.trim()).length >= 2);
    if (!valid) { setError("أدخل نص كل سؤال وخيارين على الأقل لكل سؤال."); return; }
    await run(() => action({ action: "quiz", payload: {
      courseId: course.id,
      lessonId: quizLessonId,
      title: quizTitle.trim(),
      questions: questions.map((question, position) => ({
        question: question.question.trim(), position: position + 1, points: 1,
        options: question.options.filter((option) => option.trim()).map((text, optionIndex) => ({ key: String.fromCharCode(65 + optionIndex), text: text.trim(), correct: optionIndex === question.correctIndex })),
      })),
    } }), "تم حفظ الاختبار النهائي.");
    setQuestions([{ question: "", options: ["", ""], correctIndex: 0 }]);
  }

  async function addLesson(event: React.FormEvent<HTMLFormElement>, sectionId: string, count: number) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const type = String(data.get("type") ?? "text");
    const videoUrl = type === "video" ? String(data.get("videoUrl") ?? "").trim() : "";
    if (type === "video" && !videoUrl.startsWith("https://")) { setError("رابط فيديو CDN يجب أن يبدأ بـ https://"); return; }
    await run(() => action({ action: "lesson", sectionId, payload: {
      courseId: course.id, title: String(data.get("title") ?? ""), type,
      content: String(data.get("content") ?? "") || null, videoUrl: type === "video" ? videoUrl : null,
      position: count + 1, isFreePreview: data.get("isFreePreview") === "on",
    } }), "تمت إضافة الدرس إلى المنهج.");
    form.reset();
  }

  return (
    <div className="mt-8 space-y-8">
      <div className="sticky top-16 z-20 -mx-1 rounded-2xl border border-border bg-surface/95 p-2 shadow-sm backdrop-blur md:top-20">
        <nav className="flex gap-2 overflow-x-auto" aria-label="أقسام بناء الدورة">
          <a href="#course-details" className="app-button app-button-outline shrink-0">المعلومات</a>
          <a href="#curriculum" className="app-button app-button-outline shrink-0">المنهج والدروس</a>
          {editable && <a href="#course-quiz" className="app-button app-button-outline shrink-0">الاختبار</a>}
          {editable && <a href="#course-submit" className="app-button app-button-outline shrink-0">الإرسال</a>}
          {course.status === "published" && course.hasLiveSessions && <a href="#course-session" className="app-button app-button-outline shrink-0">الحصص المباشرة</a>}
        </nav>
        {error && <p role="alert" className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" aria-live="polite" className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      </div>
      {!editable && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900">التعديل متوقف أثناء المراجعة أو بعد النشر.</div>}
      <form id="course-details" onSubmit={updateCourse} className="scroll-mt-40 rounded-2xl border border-border bg-surface p-5 md:p-7">
        <h2 className="text-xl font-black text-secondary">معلومات الدورة</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-secondary sm:col-span-2">العنوان<input name="title" defaultValue={course.title} required disabled={!editable} className={input} /></label>
          <label className="text-sm font-bold text-secondary sm:col-span-2">الملخص<textarea name="summary" defaultValue={course.summary} rows={2} disabled={!editable} className={`${input} py-3`} /></label>
          <label className="text-sm font-bold text-secondary sm:col-span-2">الوصف<textarea name="description" defaultValue={course.description} rows={4} disabled={!editable} className={`${input} py-3`} /></label>
          <label className="text-sm font-bold text-secondary">المستوى<select name="level" defaultValue={course.level} disabled={!editable} className={input}><option value="beginner">مبتدئ</option><option value="intermediate">متوسط</option><option value="advanced">متقدم</option></select></label>
          <label className="text-sm font-bold text-secondary">السعر<input name="priceAmount" type="number" min="0" defaultValue={course.priceAmount} disabled={!editable} className={input} /></label>
          <label className="text-sm font-bold text-secondary">المدة بالساعات<input name="durationHours" type="number" min="1" defaultValue={course.durationHours} disabled={!editable} className={input} /></label>
          <label className="text-sm font-bold text-secondary">رابط الغلاف<input name="coverImageUrl" type="url" dir="ltr" defaultValue={course.coverImageUrl ?? ""} disabled={!editable} className={input} /></label>
        </div>
        <label className="mt-4 flex min-h-11 items-center gap-3 text-sm font-bold"><input name="hasLiveSessions" type="checkbox" defaultChecked={course.hasLiveSessions} disabled={!editable} className="h-5 w-5" /> حصص مباشرة</label>
        {editable && <button disabled={busy} className="mt-5 min-h-11 rounded-xl bg-secondary px-6 font-bold text-white disabled:opacity-60">حفظ المعلومات</button>}
      </form>

      <section id="curriculum" className="scroll-mt-40 rounded-2xl border border-border bg-surface p-5 md:p-7">
        <h2 className="text-xl font-black text-secondary">المنهج</h2>
        <div className="mt-5 space-y-5">
          {outline.sections.map((section) => (
            <article key={section.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3"><h3 className="font-black text-secondary">{section.position}. {section.title}</h3>{editable && <div className="flex gap-3 text-xs font-bold"><button type="button" onClick={() => setEditingSectionId(editingSectionId === section.id ? null : section.id)} className="text-primary-dark underline underline-offset-4">تعديل القسم</button><button type="button" onClick={() => void removeSection(section.id)} className="text-danger underline underline-offset-4">حذف</button></div>}</div>
              {editable && editingSectionId === section.id && <form onSubmit={(event) => void updateSection(event, section.id)} className="mt-3 flex flex-col gap-2 rounded-xl border border-primary/25 bg-primary-light/25 p-3 sm:flex-row sm:items-end"><label className="flex-1 text-xs font-bold text-secondary">عنوان القسم<input name="title" defaultValue={section.title} required className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm" /></label><button disabled={busy} className="app-button app-button-primary min-h-11 text-xs">حفظ</button></form>}
              {section.lessons.length ? <ol className="mt-3 space-y-3">{section.lessons.map((lesson) => <li key={lesson.id} className="rounded-lg bg-surface px-3 py-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-3"><span>{lesson.position}. {lesson.title}</span><div className="flex flex-wrap items-center gap-3"><span className="text-xs text-muted">{lesson.type}{lesson.isFreePreview ? " · معاينة" : ""}</span>{editable && <><button type="button" onClick={() => setEditingLessonId(editingLessonId === lesson.id ? null : lesson.id)} className="min-h-11 text-xs font-bold text-primary-dark underline underline-offset-4">تعديل</button><button type="button" onClick={() => void removeLesson(lesson.id)} className="min-h-11 text-xs font-bold text-danger underline underline-offset-4">حذف</button></>}</div></div>{editable && editingLessonId === lesson.id && <form onSubmit={(event) => void updateLesson(event, lesson.id, lesson.position)} className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2"><label className="text-sm font-bold text-secondary">عنوان الدرس<input name="title" defaultValue={lesson.title} required className={input} /></label><label className="text-sm font-bold text-secondary">نوع الدرس<select name="type" defaultValue={lesson.type} className={input}><option value="text">نص</option><option value="video">فيديو</option><option value="assignment">واجب</option></select></label><label className="text-sm font-bold text-secondary sm:col-span-2">المحتوى النصي<textarea name="content" defaultValue={lesson.content ?? ""} rows={3} className={`${input} py-2`} /></label><label className="text-sm font-bold text-secondary sm:col-span-2">رابط فيديو CDN الآمن<input name="videoUrl" type="url" inputMode="url" dir="ltr" defaultValue={lesson.videoUrl ?? ""} placeholder="https://cdn.example.com/video.mp4" className={input} /><span className="mt-1 block text-xs font-normal leading-6 text-muted">يجب أن يكون رابط HTTPS مباشرًا. اختبره قبل حفظ الدرس.</span>{lesson.videoUrl && <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center font-bold text-primary-dark underline">اختبار رابط CDN ↗</a>}</label><label className="flex min-h-11 items-center gap-2 text-sm"><input name="isFreePreview" type="checkbox" defaultChecked={lesson.isFreePreview} /> معاينة مجانية</label><div className="flex flex-wrap gap-2"><button disabled={busy} className="app-button app-button-primary min-h-11 text-xs">حفظ الدرس</button><button type="button" onClick={() => setEditingLessonId(null)} className="app-button app-button-outline min-h-11 text-xs">إلغاء</button></div></form>}</li>)}</ol> : <p className="mt-2 text-sm text-muted">لا دروس بعد.</p>}
              {editable && <form onSubmit={(event) => void addLesson(event, section.id, section.lessons.length)} className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2"><label className="text-sm font-bold text-secondary">عنوان الدرس<input name="title" required className={input} /></label><label className="text-sm font-bold text-secondary">نوع الدرس<select name="type" className={input}><option value="text">نص</option><option value="video">فيديو</option><option value="assignment">واجب</option></select></label><label className="text-sm font-bold text-secondary sm:col-span-2">المحتوى النصي<textarea name="content" rows={2} className={`${input} py-2`} /></label><label className="text-sm font-bold text-secondary sm:col-span-2">رابط فيديو CDN الآمن<input name="videoUrl" type="url" inputMode="url" dir="ltr" placeholder="https://cdn.example.com/video.mp4" className={input} /><span className="mt-1 block text-xs font-normal leading-6 text-muted">ألصق رابط HTTPS المباشر من مزود CDN. لا ترفع ملف الفيديو إلى المنصة.</span></label><label className="flex min-h-11 items-center gap-2 text-sm"><input name="isFreePreview" type="checkbox" /> معاينة مجانية</label><button disabled={busy} className="min-h-11 rounded-xl border border-secondary px-4 text-sm font-bold text-secondary">إضافة الدرس</button></form>}
            </article>
          ))}
        </div>
        {editable && <form onSubmit={addSection} className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-end"><label className="flex-1 text-sm font-bold text-secondary">عنوان القسم الجديد<input name="title" required className={input} /></label><button disabled={busy} className="min-h-11 shrink-0 rounded-xl bg-secondary px-6 text-sm font-bold text-white">إضافة قسم</button></form>}
      </section>

      {editable && <section id="course-quiz" className="scroll-mt-40 rounded-2xl border border-border bg-surface p-5 md:p-7">
        <h2 className="text-xl font-black text-secondary">الاختبار النهائي</h2>
        <p className="mt-1 text-sm leading-7 text-muted">أنشئ اختباراً اختيارياً متعدد الإجابات. درجة النجاح المعتمدة هي 70%، وللطالب ثلاث محاولات يومياً.</p>
        {lessons.length === 0 ? <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">أضف درساً واحداً على الأقل قبل إنشاء الاختبار.</p> : (
          <form onSubmit={createQuiz} className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-secondary">عنوان الاختبار<input value={quizTitle} onChange={(event) => setQuizTitle(event.target.value)} required className={input} /></label>
              <label className="text-sm font-bold text-secondary">الدرس المرتبط<select value={quizLessonId} onChange={(event) => setQuizLessonId(event.target.value)} className={input}>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.sectionTitle} — {lesson.title}</option>)}</select></label>
            </div>
            {questions.map((question, questionIndex) => <fieldset key={questionIndex} className="rounded-xl border border-border bg-background p-4"><legend className="px-2 text-sm font-black text-secondary">السؤال {questionIndex + 1}</legend><label className="block text-sm font-bold text-secondary">نص السؤال<textarea value={question.question} onChange={(event) => updateQuestion(questionIndex, { question: event.target.value })} required rows={2} className={`${input} py-2`} /></label><div className="mt-4 grid gap-3 sm:grid-cols-2">{question.options.map((option, optionIndex) => <div key={optionIndex} className="flex items-center gap-2 text-sm"><input type="radio" name={`correct-${questionIndex}`} checked={question.correctIndex === optionIndex} onChange={() => updateQuestion(questionIndex, { correctIndex: optionIndex })} aria-label={`تحديد الخيار ${optionIndex + 1} إجابة صحيحة للسؤال ${questionIndex + 1}`} /><label className="flex-1 text-xs font-bold text-secondary">الخيار {optionIndex + 1}<input value={option} onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)} required className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-primary" /></label></div>)}</div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => updateQuestion(questionIndex, { options: [...question.options, ""] })} className="app-button app-button-outline min-h-11 text-xs">إضافة خيار</button>{questions.length > 1 && <button type="button" onClick={() => setQuestions((current) => current.filter((_, index) => index !== questionIndex))} className="app-button min-h-11 border-danger text-xs font-bold text-danger">حذف السؤال</button>}</div></fieldset>)}
            <div className="flex flex-wrap gap-3"><button type="button" onClick={() => setQuestions((current) => [...current, { question: "", options: ["", ""], correctIndex: 0 }])} className="app-button app-button-outline min-h-11">إضافة سؤال</button><button disabled={busy} className="app-button app-button-primary min-h-11">حفظ الاختبار</button></div>
          </form>
        )}
      </section>}

      {editable && <div id="course-submit" className="scroll-mt-40 rounded-2xl border border-primary/30 bg-primary/5 p-5"><h2 className="font-black text-secondary">جاهز للمراجعة؟</h2><p className="mt-1 text-sm text-muted">يجب إضافة درس واحد على الأقل. بعد الإرسال يتوقف التعديل حتى قرار المراجع.</p><button type="button" disabled={busy || outline.sections.every((section) => section.lessons.length === 0)} onClick={() => void run(() => action({ action: "submit", courseId: course.id }), "تم إرسال الدورة للمراجعة.")} className="mt-4 min-h-11 rounded-xl bg-primary px-6 font-bold text-secondary disabled:opacity-50">إرسال للمراجعة</button></div>}
      {course.status === "published" && course.hasLiveSessions && <form id="course-session" onSubmit={scheduleSession} className="scroll-mt-40 rounded-2xl border border-border bg-surface p-5 md:p-7"><h2 className="text-xl font-black text-secondary">جدولة حصة مباشرة</h2><p className="mt-1 text-sm text-muted">ينشئ النظام اجتماع Zoom مركزياً ويربطه بالدورة.</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-sm font-bold text-secondary">عنوان الحصة<input name="title" required className={input} /></label><label className="text-sm font-bold text-secondary">موعد البداية<input name="startsAt" required type="datetime-local" className={input} /></label><label className="text-sm font-bold text-secondary">المدة بالدقائق<input name="durationMin" required type="number" min="5" max="480" defaultValue="60" className={input} /></label></div><button disabled={busy} className="mt-4 min-h-11 rounded-xl bg-secondary px-6 font-bold text-white disabled:opacity-60">جدولة الحصة</button></form>}
    </div>
  );
}
