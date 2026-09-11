import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { CourseBuilder } from "./course-builder";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/v1";
type Params = Promise<{ id: string }>;
type Course = { id: string; title: string; summary: string; description: string; status: string; level: string; priceAmount: number; durationHours: number; coverImageUrl: string | null; hasLiveSessions: boolean; reviewNotes?: string | null };
type Outline = { sections: { id: string; title: string; position: number; lessons: { id: string; title: string; type: string; position: number; isFreePreview: boolean }[] }[] };

export const metadata = { title: "بناء الدورة" };

export default async function EditCoursePage({ params }: { params: Params }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=/instructor/courses/${id}/edit`);
  const token = (session as { accessToken?: string }).accessToken;
  if (!token) redirect("/login");
  const headers = { Authorization: `Bearer ${token}` };
  const [coursesResponse, outlineResponse] = await Promise.all([
    fetch(`${API_BASE}/me/courses`, { headers, cache: "no-store" }),
    fetch(`${API_BASE}/courses/${encodeURIComponent(id)}/outline`, { headers, cache: "no-store" }),
  ]);
  if (coursesResponse.status === 403 || outlineResponse.status === 403) redirect("/dashboard");
  if (!coursesResponse.ok || !outlineResponse.ok) notFound();
  const courses = (await coursesResponse.json()) as { items: Course[] };
  const course = courses.items.find((item) => item.id === id);
  if (!course) notFound();
  const outline = (await outlineResponse.json()) as Outline;
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 md:px-6">
      <p className="text-sm font-semibold text-primary-dark">مساحة المدرب / بناء الدورة</p>
      <h1 className="mt-2 text-3xl font-black text-secondary">{course.title}</h1>
      <p className="mt-2 text-muted">الحالة: {course.status === "draft" ? "مسودة" : course.status === "pending_review" ? "بانتظار المراجعة" : course.status}</p>
      {course.reviewNotes && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">ملاحظات المراجعة: {course.reviewNotes}</p>}
      <CourseBuilder course={course} outline={outline} />
    </div>
  );
}
