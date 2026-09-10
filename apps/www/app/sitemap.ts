// sitemap.xml — الصفحات العامة + كل دورة منشورة (SEO للكتالوج).
import type { MetadataRoute } from "next";
import { listCourses } from "@/lib/api";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://alameedtraining.com";

export const revalidate = 3600; // كل ساعة — الكتالوج يتغير

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // الصفحات الثابتة
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/courses`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/verify`, changeFrequency: "monthly", priority: 0.7 },
  ];

  // الدورات المنشورة من قاعدة البيانات
  let coursePages: MetadataRoute.Sitemap = [];
  try {
    const res = await listCourses({ pageSize: 100 });
    coursePages = res.items.map((c) => ({
      url: `${BASE}/courses/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // الـAPI تعطل: الصفحات الثابتة تكفي — sitemap لا يجب أن يفشل
  }

  return [...staticPages, ...coursePages];
}
