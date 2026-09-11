import { expect, test } from "@playwright/test";

const user = process.env.E2E_STUDENT_USER;
const password = process.env.E2E_STUDENT_PASSWORD;

test("student SSO returns to dashboard without exposing access token", async ({ page }) => {
  test.skip(!user || !password, "E2E student credentials are not configured");
  await page.goto("https://learn.alameedtraining.com/dashboard");
  await page.getByRole("button", { name: /تسجيل الدخول/ }).click();
  await page.waitForURL(/auth\.alameedtraining\.com/);
  await page.locator("#username").fill(user!);
  await page.locator("#password").fill(password!);
  await page.locator("#kc-login").click();
  await page.waitForURL(/learn\.alameedtraining\.com\/dashboard/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("مرحبًا");
  await expect(page.getByRole("button", { name: "تسجيل الخروج" })).toBeVisible();
  const session = await page.evaluate(() => fetch("/api/auth/session").then((response) => response.json()));
  expect(session.accessToken).toBeUndefined();
  expect(session.user?.id).toBeTruthy();
});
