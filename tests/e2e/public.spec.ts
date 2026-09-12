import { expect, test } from "@playwright/test";

const LEARN = "https://learn.alameedtraining.com";
const ERP = "https://erp.alameedtraining.com";
const API = "https://api.alameedtraining.com/v1";

test("public website critical routes render without overflow", async ({ page }) => {
  for (const path of ["/", "/courses", "/about", "/contact", "/verify", "/privacy", "/terms"]) {
    const response = await page.goto(path, { waitUntil: "networkidle" });
    expect(response?.status(), path).toBeLessThan(400);
    expect(await page.locator("h1").count(), `${path} h1`).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${path} overflow`).toBe(true);
  }
});

test("catalog search and course details are connected to API", async ({ page }) => {
  await page.goto("/courses");
  await page.getByPlaceholder(/إدارة المشاريع/).fill("إدارة المشاريع");
  await page.getByRole("button", { name: "بحث" }).click();
  await expect(page).toHaveURL(/q=/);
  await expect(page.getByText("أساسيات إدارة المشاريع").first()).toBeVisible();
  await page.getByText("أساسيات إدارة المشاريع").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("أساسيات إدارة المشاريع");
});

test("certificate verification handles an unknown serial", async ({ page }) => {
  await page.goto("/verify");
  await page.getByLabel("الرقم التسلسلي للشهادة").fill("ALD-2099-NOTFOUND");
  await page.getByRole("button", { name: "تحقق" }).click();
  await expect(page.getByText("لم نعثر على شهادة بهذا الرقم")).toBeVisible();
});

test("mobile navigation opens, closes, and routes correctly", async ({ page }, testInfo) => {
  if (!testInfo.project.name.startsWith("mobile")) test.skip();
  await page.goto("/");
  await page.getByRole("button", { name: "فتح القائمة" }).click();
  await expect(page.getByRole("navigation", { name: "قائمة الهاتف" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "قائمة الهاتف" })).toHaveCount(0);
  await page.getByRole("button", { name: "فتح القائمة" }).click();
  await page.getByRole("link", { name: "الدورات" }).first().click();
  await expect(page).toHaveURL(/\/courses$/);
});

test("protected portals preserve requested destination", async ({ page }) => {
  await page.goto(`${LEARN}/dashboard`);
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard/);
  await page.goto(`${ERP}/reports`);
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Freports/);
});

test("API liveness readiness and authorization", async ({ request }) => {
  expect((await request.get(`${API}/health`)).status()).toBe(200);
  expect((await request.get(`${API}/ready`)).status()).toBe(200);
  expect((await request.get(`${API}/me`)).status()).toBe(401);
});
