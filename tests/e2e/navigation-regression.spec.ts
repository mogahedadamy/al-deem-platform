import { expect, test, type Page } from "@playwright/test";
import { destinationUrl, destinations } from "./environment";

function usesCompactHeader(projectName: string) {
  return projectName.startsWith("mobile") || projectName.startsWith("tablet");
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
    `${label} must not overflow horizontally`,
  ).toBe(true);
}

async function expectLinkDestination(page: Page, name: string, destination: string) {
  const href = await page.getByRole("link", { name, exact: true }).first().getAttribute("href");
  expect(href, `${name} must expose an href`).toBeTruthy();
  expect(new URL(href!, page.url()).href, `${name} destination`).toBe(new URL(destination).href);
}

test.describe("environment-aware cross-app navigation", () => {
  test("desktop header exposes the local identity and learning destinations", async ({ page }, testInfo) => {
    test.skip(usesCompactHeader(testInfo.project.name), "Desktop header is hidden below its breakpoint.");

    await page.goto(destinationUrl(destinations.www));
    await expect(page.getByRole("navigation", { name: "القائمة الرئيسية" })).toBeVisible();
    await expect(page.getByRole("link", { name: "تسجيل الدخول" })).toHaveAttribute(
      "href",
      "/login",
    );
    await expectLinkDestination(page, "منصة التعلم", destinations.learn);
    await expectNoHorizontalOverflow(page, "public desktop header");
  });

  test("medium header keeps primary actions and moves secondary links into more", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "One deterministic run covers the 1024px breakpoint.");
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(destinationUrl(destinations.www));

    await expect(page.getByRole("navigation", { name: "القائمة الرئيسية" })).toBeVisible();
    await expect(page.getByRole("link", { name: "تسجيل الدخول" })).toBeVisible();
    await expectLinkDestination(page, "منصة التعلم", destinations.learn);

    const disclosure = page.locator('button[aria-controls="mobile-navigation"]');
    await expect(disclosure).toBeVisible();
    await disclosure.click();
    const menu = page.getByRole("navigation", { name: "قائمة الهاتف" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link", { name: "تواصل معنا", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page, "public medium header");
  });

  test("landscape header keeps the full brand and every action keyboard reachable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "One deterministic run covers the landscape breakpoint.");
    await page.setViewportSize({ width: 1024, height: 640 });
    await page.goto(destinationUrl(destinations.www));

    const header = page.locator("header");
    const brandTitle = header.locator(".brand-title");
    await expect(brandTitle).toHaveText("مركز العميد للتدريب");
    const brandWidth = await brandTitle.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(brandWidth.clientWidth, "the real brand name must receive visible width").toBeGreaterThan(0);
    expect(brandWidth.scrollWidth, "the real brand name must fit its allocated width").toBeLessThanOrEqual(brandWidth.clientWidth);

    const singleLineActions = header.locator(".header-actions a:visible");
    for (let index = 0; index < await singleLineActions.count(); index += 1) {
      expect(
        await singleLineActions.nth(index).evaluate((element) => {
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          const lineTops = new Set<number>();
          while (walker.nextNode()) {
            const range = document.createRange();
            range.selectNodeContents(walker.currentNode);
            for (const rect of range.getClientRects()) lineTops.add(Math.round(rect.top));
          }
          return lineTops.size;
        }),
        `header action ${index + 1} must remain on one line`,
      ).toBe(1);
    }

    const disclosure = page.locator('button[aria-controls="mobile-navigation"]');
    await disclosure.focus();
    await page.keyboard.press("Enter");
    const menu = page.locator("#mobile-navigation");
    await expect(menu).toBeVisible();
    const links = menu.getByRole("link");
    const visibleLinks = [];
    for (let index = 0; index < await links.count(); index += 1) {
      if (await links.nth(index).isVisible()) visibleLinks.push(links.nth(index));
    }
    expect(visibleLinks.length, "landscape disclosure must contain keyboard targets").toBeGreaterThan(0);
    for (const link of visibleLinks) {
      await page.keyboard.press("Tab");
      await expect(link).toBeFocused();
    }
    await expect(visibleLinks.at(-1)!).toHaveAccessibleName("التحقق من شهادة");
    await page.keyboard.press("Escape");
    await expect(disclosure).toBeFocused();
  });

  test("mobile menu opens, closes, and keeps environment destinations", async ({ page }, testInfo) => {
    test.skip(!usesCompactHeader(testInfo.project.name), "Compact menu is hidden at desktop breakpoints.");

    await page.goto(destinationUrl(destinations.www));
    const trigger = page.locator('button[aria-controls="mobile-navigation"]');
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    const menu = page.getByRole("navigation", { name: "قائمة الهاتف" });
    await expect(menu).toBeVisible();
    await expect(page.getByRole("link", { name: "تسجيل الدخول" })).toHaveAttribute(
      "href",
      "/login",
    );
    await expectLinkDestination(page, "الدخول إلى منصة التعلم", destinations.learn);

    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expectNoHorizontalOverflow(page, "public mobile menu");
  });

  test("catalog level filters preserve the search and reset cleanly", async ({ page }) => {
    await page.goto(destinationUrl(destinations.www, "/courses?q=إدارة+المشاريع"));
    await page.getByRole("link", { name: "مبتدئ", exact: true }).click();
    await expect(page).toHaveURL((url) =>
      url.origin === new URL(destinations.www).origin
      && url.pathname === "/courses"
      && url.searchParams.get("q") === "إدارة المشاريع"
      && url.searchParams.get("level") === "beginner",
    );

    await page.getByRole("link", { name: "كل المستويات", exact: true }).click();
    await expect(page).toHaveURL((url) =>
      url.origin === new URL(destinations.www).origin
      && url.pathname === "/courses"
      && url.searchParams.get("q") === "إدارة المشاريع"
      && !url.searchParams.has("level"),
    );
  });

  test("submitting search preserves selected category and level but resets pagination", async ({ page }) => {
    await page.goto(destinationUrl(
      destinations.www,
      "/courses?category=project-management&level=advanced&page=9",
    ));
    await expect(page.getByRole("link", { name: "إدارة المشاريع", exact: true })).toHaveAttribute("aria-current", "true");
    await expect(page.getByRole("link", { name: "متقدم", exact: true })).toHaveAttribute("aria-current", "true");

    await page.getByPlaceholder(/إدارة المشاريع/).fill("أساسيات");
    await page.getByRole("button", { name: "بحث", exact: true }).click();
    await expect(page).toHaveURL((url) =>
      url.pathname === "/courses"
      && url.searchParams.get("category") === "project-management"
      && url.searchParams.get("level") === "advanced"
      && url.searchParams.get("q") === "أساسيات"
      && !url.searchParams.has("page"),
    );
    await expect(page.getByRole("link", { name: "إدارة المشاريع", exact: true })).toHaveAttribute("aria-current", "true");
    await expect(page.getByRole("link", { name: "متقدم", exact: true })).toHaveAttribute("aria-current", "true");
  });

  test("published course exposes its complete public outline and learning action", async ({ page }) => {
    await page.goto(destinationUrl(destinations.www, "/courses/project-basics"));
    await expect(page.getByRole("heading", { level: 1, name: "أساسيات إدارة المشاريع" })).toBeVisible();
    await expect(page.getByText("تخطيط مشروع ومتابعة تقدم الفريق.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "الوحدة الأولى" })).toBeVisible();
    await expect(page.getByText("وضع خطة العمل", { exact: true })).toBeVisible();
    await expectLinkDestination(
      page,
      "سجّل في البرنامج",
      destinationUrl(destinations.learn, "/courses/project-basics"),
    );
    await expectNoHorizontalOverflow(page, "published course detail");
  });

  for (const portal of ["www", "learn", "erp"] as const) {
    test(`${portal} identity tabs retain their callback inside the configured origin`, async ({ page }) => {
      const origin = destinations[portal];
      const callbackUrl = "/courses/project-management?tab=lessons";
      await page.goto(destinationUrl(origin, `/login?${new URLSearchParams({ callbackUrl })}`));

      const registrationLabel = portal === "erp" ? "طلب حساب" : "إنشاء حساب";
      await expect(page.getByRole("link", { name: registrationLabel, exact: true })).toHaveAttribute(
        "href",
        `/register?${new URLSearchParams({ callbackUrl })}`,
      );
      await page.getByRole("link", { name: registrationLabel, exact: true }).click();
      await expect(page).toHaveURL((url) =>
        url.origin === new URL(origin).origin
        && url.pathname === "/register"
        && url.searchParams.get("callbackUrl") === callbackUrl,
      );
      await expect(
        page.getByRole("navigation", { name: "إجراءات الحساب" })
          .getByRole("link", { name: "تسجيل الدخول", exact: true }),
      ).toHaveAttribute(
        "href",
        `/login?${new URLSearchParams({ callbackUrl })}`,
      );
      await expectNoHorizontalOverflow(page, `${portal} identity links`);
    });
  }
});
