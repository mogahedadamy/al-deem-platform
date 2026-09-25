import Link from "next/link";
import { auth } from "@/auth";
import { API_BASE } from "@/lib/api";
import { SessionActions } from "./session-actions";

export const metadata = { title: "الحصص المباشرة" };

type LiveSession = { id: string; courseId: string; title: string; status: string; startsAt: string; durationMin: number; timezone: string; recordingUrl?: string };
const statusLabel: Record<string, string> = { scheduled: "مجدولة", join_open: "الانضمام مفتوح", live: "مباشرة الآن", ended: "منتهية", recording_processing: "جارٍ تجهيز التسجيل", archived: "مؤرشفة", cancelled: "ملغاة" };

export default async function InstructorSessionsPage() {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  const response = token ? await fetch(`${API_BASE}/live-sessions/mine`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => null) : null;
  const data = response?.ok ? await response.json() as { items: LiveSession[] } : null;

  return <div className="flex flex-1 flex-col"><header className="border-b border-border bg-surface"><div className="app-container py-8 sm:py-10"><nav className="mb-3 text-sm text-muted" aria-label="مسار التنقل"><Link href="/dashboard" className="hover:text-primary">لوحة المدرب</Link><span className="mx-2">/</span><span className="font-medium text-secondary">الحصص المباشرة</span></nav><p className="app-kicker">مساحة المدرب</p><h1 className="app-title">إدارة الحصص المباشرة</h1><p className="app-description">تابع حالة حصصك، افتح الانضمام في الوقت المناسب، وأنهِ الحصة بعد اكتمالها. أنشئ الحصص من محرر الدورة المنشورة.</p></div></header><main className="app-page flex-1">{!data ? <div className="app-alert border-amber-200 bg-amber-50 text-amber-900"><p className="font-black">تعذر تحميل الحصص</p><p className="mt-2 text-sm">تحقق من صلاحيات حسابك ثم أعد المحاولة.</p></div> : data.items.length === 0 ? <div className="app-empty"><p className="font-black text-secondary">لا توجد حصص مباشرة قادمة</p><p className="mt-2 text-sm">بعد نشر دورة تتضمن حصصاً مباشرة، افتح محررها لجدولة أول حصة.</p><Link href="/dashboard" className="app-button app-button-primary mt-5">العودة إلى دوراتي</Link></div> : <ul className="grid gap-4 lg:grid-cols-2">{data.items.map((item) => <li key={item.id} className="app-card p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-black text-secondary">{item.title}</p><p className="mt-2 text-sm text-muted">{new Date(item.startsAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })} · {item.durationMin} دقيقة</p></div><span className="rounded-full bg-primary-light px-3 py-1 text-xs font-black text-primary-dark">{statusLabel[item.status] ?? item.status}</span></div>{item.recordingUrl && <a href={item.recordingUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-black text-primary-dark underline underline-offset-4">فتح التسجيل</a>}<SessionActions session={item} /></li>)}</ul>}</main></div>;
}
