import type { MetadataRoute } from "next";
import { listCourses, type Course } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://alameedtraining.com";
export const revalidate = 3600;

async function allPublishedCourses(): Promise<Course[]> {
  const first = await listCourses({ page: 1, pageSize: 12 });
  const pages = Math.ceil(first.total / 12);
  if (pages <= 1) return first.items;
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, index) => listCourses({ page: index + 2, pageSize: 12 })));
  return [...first.items, ...rest.flatMap((page) => page.items)];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/courses`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/contact`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/verify`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const courses = await allPublishedCourses();
    return [...staticPages, ...courses.map((course) => ({ url: `${BASE}/courses/${course.slug}`, changeFrequency: "weekly" as const, priority: 0.8 }))];
  } catch {
    return staticPages;
  }
}
