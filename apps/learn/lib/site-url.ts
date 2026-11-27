export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://alameedtraining.com"
).replace(/\/$/, "");

export function siteUrl(path = "") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
