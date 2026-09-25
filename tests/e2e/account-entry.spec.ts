import { expect, test } from "@playwright/test";

const learnBaseUrl = process.env.E2E_LEARN_BASE_URL;

test.describe("بوابة حساب الطالب", () => {
  test.skip(!learnBaseUrl, "Set E2E_LEARN_BASE_URL to the deployed learn application before running account-entry checks.");

  test("explains login, registration, and preserves the requested destination", async ({ page }) => {
    await page.goto(`${learnBaseUrl}/login?callbackUrl=/courses/test-course`);
    await expect(page.getByRole("heading", { name: "مرحباً بعودتك" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "تسجيل الدخول" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("نسيت كلمة المرور؟")).toBeVisible();

    await page.getByRole("tab", { name: "إنشاء حساب" }).click();
    await expect(page.getByRole("heading", { name: "ابدأ رحلتك التعليمية بثقة" })).toBeVisible();
    await expect(page.getByRole("button", { name: "إنشاء حساب طالب" })).toBeVisible();
  });
});
