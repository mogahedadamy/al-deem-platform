import Link from "next/link";
import type { ReactNode } from "react";
import type { Course, CourseLevel } from "@/lib/api";

// ===== عرض مستوى الدورة =====
const LEVEL_LABEL: Record<CourseLevel, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
};

export function LevelBadge({ level }: { level: CourseLevel }) {
  return (
    <span className="rounded-md bg-secondary/5 px-2 py-0.5 text-xs font-medium text-secondary">
      {LEVEL_LABEL[level] ?? level}
    </span>
  );
}

// ===== تنسيق السعر =====
export function formatPrice(amount: number, currency: string): string {
  if (amount === 0) return "مجانًا";
  const formatted = new Intl.NumberFormat("ar-EG", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ${currency === "SDG" ? "ج.س" : currency}`;
}

// ===== بطاقة دورة =====
export function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col rounded-xl border border-border bg-surface transition-colors hover:border-primary/60"
    >
      {/* غلاف بلون الهوية — حتى يتوفر coverImageUrl حقيقي */}
      <div className="flex h-36 items-center justify-center border-b border-border bg-secondary/[.97] text-secondary-foreground">
        {course.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- صور خارجية من مصادر متعددة пока لا نملك CDN
          <img
            src={course.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-2xl font-black text-primary">
            دي
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-bold leading-7 text-secondary group-hover:text-primary">
          {course.title}
        </h3>
        <p className="line-clamp-2 text-sm leading-6 text-muted">
          {course.summary}
        </p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center gap-2">
            <LevelBadge level={course.level} />
            {course.hasLiveSessions && (
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-dark">
                بث مباشر
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-secondary">
            {formatPrice(course.priceAmount, course.currency)}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ===== حالة فارغة =====
export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/5 text-xl text-muted">
        ✦
      </span>
      <p className="font-semibold text-secondary">{title}</p>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

// ===== حالة خطأ =====
export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-16 text-center">
      <p className="font-semibold text-red-800">{message}</p>
      <p className="text-sm text-red-600">
        حاول تحديث الصفحة — إن استمرت المشكلة تواصل معنا.
      </p>
    </div>
  );
}
