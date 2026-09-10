// عميل API المركزي للـwww — طبقة واحدة لكل الطلبات (لا fetch مبعثر في المكونات).
// الأنواع هنا هي عقد الـOpenAPI (core-api/openapi/openapi.yaml).

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";

export type ApiError = {
  error: string;
  message: string;
};

export class RequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    // كتالوج عام: cache-safe مع revalidate قصير (ISR-style)
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new RequestError(
      res.status,
      body?.error ?? "NETWORK",
      body?.message ?? "تعذر الاتصال بالخدمة",
    );
  }
  return res.json() as Promise<T>;
}

// ===== Catalog types (عقد OpenAPI) =====

export type CourseLevel = "beginner" | "intermediate" | "advanced";
export type CourseStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "archived";

export type Course = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  categoryId: string | null;
  instructorId: string;
  status: CourseStatus;
  level: CourseLevel;
  language: string;
  priceAmount: number;
  currency: string;
  durationHours: number;
  coverImageUrl: string | null;
  hasLiveSessions: boolean;
  reviewNotes?: string | null;
  publishedAt: string | null;
};

export type Category = {
  id: string;
  slug: string;
  nameAr: string;
  description: string | null;
};

export type LessonType = "video" | "text" | "quiz" | "assignment";

export type OutlineLesson = {
  id: string;
  title: string;
  type: LessonType;
  position: number;
  isFreePreview: boolean;
};

export type OutlineSection = {
  id: string;
  title: string;
  lessons: OutlineLesson[];
};

// ===== API functions =====

export async function listCourses(params: {
  category?: string;
  level?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: Course[]; total: number }> {
  const sp = new URLSearchParams();
  if (params.category) sp.set("category", params.category);
  if (params.level) sp.set("level", params.level);
  if (params.q) sp.set("q", params.q);
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  const qs = sp.toString();
  return get<{ items: Course[]; total: number }>(
    `/public/courses${qs ? `?${qs}` : ""}`,
  );
}

export async function getCourse(slug: string): Promise<Course> {
  return get<Course>(`/public/courses/${encodeURIComponent(slug)}`);
}

export async function getCourseOutline(
  slug: string,
): Promise<{ sections: OutlineSection[] }> {
  return get<{ sections: OutlineSection[] }>(
    `/public/courses/${encodeURIComponent(slug)}/outline`,
  );
}

export async function listCategories(): Promise<{ items: Category[] }> {
  return get<{ items: Category[] }>("/public/categories");
}
