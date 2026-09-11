// robots.txt — التطبيق العام فقط؛ مسارات API والداخلية مستثناة.
import type { MetadataRoute } from "next";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://alameedtraining.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/courses", "/about", "/contact", "/verify", "/privacy", "/terms"],
      disallow: ["/api/"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
