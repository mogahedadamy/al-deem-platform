import { expect, type Locator, type Page, test } from "@playwright/test";

const LEARN = process.env.E2E_LEARN_BASE_URL ?? "https://learn.alameedtraining.com";
const ZITADEL_ISSUER = process.env.E2E_ZITADEL_ISSUER ?? "https://auth.alameedtraining.com";
const studentUser = process.env.E2E_STUDENT_USER;
const studentPassword = process.env.E2E_STUDENT_PASSWORD;

const missingCredentials = [
  !studentUser ? "E2E_STUDENT_USER" : null,
  !studentPassword ? "E2E_STUDENT_PASSWORD" : null,
].filter(Boolean);

function visible(locator: Locator) {
  return locator.filter({ visible: true }).first();
}

async function submitVisibleForm(page: Page) {
  const button = visible(page.locator('button[type="submit"], input[type="submit"]'));
  await expect(button, "Zitadel must expose a visible submit action").toBeVisible();
  await button.click();
}

async function signInThroughZitadel(page: Page) {
  const username = visible(page.locator([
    'input[autocomplete="username"]',
    'input[name="loginName"]',
    'input[name="username"]',
    'input[type="email"]',
  ].join(", ")));
  const password = visible(page.locator('input[autocomplete="current-password"], input[name="password"], input[type="password"]'));

  await expect(username, "Zitadel username field must be visible").toBeVisible();
  await username.fill(studentUser!);

  if (await password.isVisible()) {
    await password.fill(studentPassword!);
    await submitVisibleForm(page);
    return;
  }

  await submitVisibleForm(page);
  await expect(password, "Zitadel password step must be visible").toBeVisible();
  await password.fill(studentPassword!);
  await submitVisibleForm(page);
}

test.describe("authenticated Zitadel release journey", () => {
  test.beforeEach(() => {
    if (missingCredentials.length > 0) {
      if (process.env.CI) {
        throw new Error(`Authenticated release tests require: ${missingCredentials.join(", ")}`);
      }
      test.skip(true, `Set ${missingCredentials.join(" and ")} to run the authenticated journey locally.`);
    }
  });

  test("student SSO returns to the requested page without exposing an access token", async ({ page }) => {
    await page.goto(`${LEARN}/dashboard`);
    await expect(page).toHaveURL((url) =>
      url.pathname === "/login" && url.searchParams.get("callbackUrl") === "/dashboard",
    );

    await page.getByRole("button", { name: /متابعة إلى تسجيل الدخول|تسجيل الدخول/ }).click();
    await page.waitForURL((url) => url.origin === new URL(ZITADEL_ISSUER).origin);
    await signInThroughZitadel(page);

    await page.waitForURL((url) =>
      url.origin === new URL(LEARN).origin && url.pathname === "/dashboard",
    );
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "تسجيل الخروج" })).toBeVisible();

    const sessionResponse = await page.request.get(`${LEARN}/api/auth/session`);
    expect(sessionResponse.ok()).toBe(true);
    expect(sessionResponse.headers()["cache-control"]).toContain("no-store");
    const session = await sessionResponse.json() as {
      accessToken?: string;
      user?: { id?: string };
    };
    expect(session.accessToken).toBeUndefined();
    expect(session.user?.id).toBeTruthy();
  });
});
