import Link from "next/link";
import type { ReactNode } from "react";
import { Clock, Users, Star, Video, Heart } from "lucide-react";
import type { Course, CourseLevel } from "@/lib/api";

// ===== عرض مستوى الدورة =====
const LEVEL_LABEL: Record<CourseLevel, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
};

export function LevelBadge({ level }: { level: CourseLevel }) {
  return (
    <span className="rounded-full bg-gradient-primary/10 px-3 py-1 text-xs font-medium text-primary">
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

// ===== بطاقة دورة — بأسلوب المرجع (تدرج + ظلال + hover) =====
export function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group relative flex animate-fade-in flex-col overflow-hidden rounded-3xl border-0 bg-gradient-card shadow-card transition-all duration-500 hover:scale-105 hover:shadow-elegant"
    >
      {/* الغلاف — صورة الدورة أو تدرج الهوية */}
      <div className="relative h-48 overflow-hidden md:h-52">
        {course.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- صور خارجية من مصادر متعددة
          <img
            src={course.coverImageUrl}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-primary">
            <span className="text-4xl font-black text-white drop-shadow-lg">
              {course.title.slice(0, 2)}
            </span>
          </div>
        )}
        {/* شارة بث مباشر */}
        {course.hasLiveSessions && (
          <span className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-1 text-xs font-bold text-white shadow-hover">
            <Video className="h-3 w-3" />
            بث مباشر
          </span>
        )}
        {/* شارة المجانية */}
        {course.priceAmount === 0 && (
          <span className="absolute top-3 left-3 z-10 rounded-full bg-gradient-accent px-3 py-1 text-xs font-bold text-white shadow-hover">
            مجاني
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5 md:p-6">
        <h3 className="text-lg font-bold leading-8 text-secondary transition-colors duration-300 group-hover:text-primary">
          {course.title}
        </h3>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {course.summary}
        </p>

        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            <LevelBadge level={course.level} />
          </div>
          <span className="bg-gradient-primary bg-clip-text text-base font-bold text-transparent">
            {formatPrice(course.priceAmount, course.currency)}
          </span>
        </div>

        {/* زر التسجيل */}
        <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-2.5 text-sm font-semibold text-white opacity-95 shadow-hover transition-all duration-300 group-hover:opacity-100 group-hover:shadow-glow">
          <Heart className="h-4 w-4" />
          سجّل الآن
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
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-gradient-card px-6 py-16 text-center shadow-card">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary/10 text-2xl text-primary">
        ✦
      </span>
      <p className="font-bold text-secondary">{title}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ===== حالة خطأ =====
export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-red-200 bg-red-50 px-6 py-16 text-center">
      <p className="font-bold text-red-800">{message}</p>
      <p className="text-sm text-red-600">
        حاول تحديث الصفحة — إن استمرت المشكلة تواصل معنا.
      </p>
    </div>
  );
}
