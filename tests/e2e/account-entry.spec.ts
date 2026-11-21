import { expect, test } from "@playwright/test";

const WWW = process.env.E2E_BASE_URL ?? "https://alameedtraining.com";
const LEARN = process.env.E2E_LEARN_BASE_URL ?? "https://learn.alameedtraining.com";
const ERP = process.env.E2E_ERP_BASE_URL ?? "https://erp.alameedtraining.com";

const accountPages = [
  { name: "www login", url: `${WWW}/login`, heading: "ادخل إلى حسابك بأمان" },
  { name: "www register", url: `${WWW}/register`, heading: "ابدأ رحلتك مع العميد" },
  { name: "learn login", url: `${LEARN}/login`, heading: "مرحباً بعودتك" },
  { name: "learn register", url: `${LEARN}/register`, heading: "ابدأ رحلتك التعليمية بثقة" },
  { name: "erp login", url: `${ERP}/login`, heading: "إدارة المركز من مساحة واحدة" },
  { name: "erp register", url: `${ERP}/register`, heading: "اطلب دعوة من مسؤولك" },
] as const;

test.describe("unified account entry", () => {
  for (const accountPage of accountPages) {
    test(`${accountPage.name} is reachable and responsive`, async ({ page }) => {
      const response = await page.goto(accountPage.url, { waitUntil: "networkidle" });

      expect(response?.status(), accountPage.name).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: accountPage.heading })).toBeVisible();
      await expect(
        page.getByText("مركز العميد للتدريب").filter({ visible: true }).first(),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        `${accountPage.name} horizontal overflow`,
      ).toBe(true);
    });
  }

  test("protected destinations are preserved by learn and ERP", async ({ page }) => {
    await page.goto(`${LEARN}/dashboard`);
    await expect(page).toHaveURL((url) =>
      url.origin === new URL(LEARN).origin
      && url.pathname === "/login"
      && url.searchParams.get("callbackUrl") === "/dashboard",
    );

    await page.goto(`${ERP}/reports`);
    await expect(page).toHaveURL((url) =>
      url.origin === new URL(ERP).origin
      && url.pathname === "/login"
      && url.searchParams.get("callbackUrl") === "/reports",
    );
  });
});
