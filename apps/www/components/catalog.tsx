import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Clock3, Radio, Sparkles } from "lucide-react";
import type { Course, CourseLevel } from "@/lib/api";

const LEVEL_LABEL: Record<CourseLevel, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
};

export function LevelBadge({ level }: { level: CourseLevel }) {
  return <span className="rounded-full bg-primary-light/55 px-3 py-1 text-xs font-extrabold text-primary-dark">{LEVEL_LABEL[level] ?? level}</span>;
}

export function formatPrice(amount: number, currency: string): string {
  if (amount === 0) return "مجاناً";
  const formatted = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(amount);
  return `${formatted} ${currency === "SDG" ? "ج.س" : currency}`;
}

function localImage(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    if (["alameedtraining.com", "www.alameedtraining.com"].includes(parsed.hostname)) return parsed.pathname;
  } catch {
    return null;
  }
  return null;
}

export function CourseCard({ course, priority = false }: { course: Course; priority?: boolean }) {
  const image = localImage(course.coverImageUrl);
  return (
    <article className="card card-interactive group flex h-full flex-col overflow-hidden">
      <Link href={`/courses/${course.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-secondary" aria-label={`عرض دورة ${course.title}`}>
        {image ? (
          <Image
            src={image}
            alt={`غلاف دورة ${course.title}`}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-secondary">
            <Sparkles className="h-10 w-10 text-white/70" aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-secondary/65 via-transparent to-transparent" />
        <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-2">
          <LevelBadge level={course.level} />
          {course.hasLiveSessions && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
              <Radio className="h-3.5 w-3.5" aria-hidden="true" /> بث مباشر
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <Link href={`/courses/${course.slug}`}>
          <h3 className="text-lg font-black leading-8 text-secondary transition-colors group-hover:text-primary-dark">{course.title}</h3>
        </Link>
        <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted-foreground">{course.summary}</p>
        <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>{course.durationHours} ساعة تدريبية</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-4 border-t border-border pt-5">
          <div>
            <span className="block text-[.68rem] font-bold text-muted-foreground">رسوم البرنامج</span>
            <span className="mt-1 block text-lg font-black text-secondary">{formatPrice(course.priceAmount, course.currency)}</span>
          </div>
          <Link href={`/courses/${course.slug}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-white transition-colors hover:bg-primary" aria-label={`تفاصيل ${course.title}`}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 border-dashed px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-light/50 text-2xl text-primary">✦</span>
      <p className="font-black text-secondary">{title}</p>
      {hint && <p className="max-w-lg text-sm leading-7 text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center" role="alert">
      <p className="font-black text-red-800">{message}</p>
      <p className="mt-2 text-sm text-red-700">حاول تحديث الصفحة، وإن استمرت المشكلة تواصل معنا.</p>
    </div>
  );
}
