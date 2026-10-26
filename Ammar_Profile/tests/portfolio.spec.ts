import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { dictionaries } from "../src/data/ui";
import { projects } from "../src/data/projects";
import { prepareContact } from "../src/lib/contact";
const errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(() => {
  expect(errors, "No browser runtime or hydration errors").toEqual([]);
});

const languageCases = [
  { primary: "ar-YE", secondary: "en", saved: null, path: "/", expected: "ar" },
  {
    primary: "en-US",
    secondary: "ar-YE",
    saved: null,
    path: "/",
    expected: "en",
  },
  { primary: "fr-FR", secondary: "ar", saved: null, path: "/", expected: "en" },
  { primary: "en-US", secondary: "ar", saved: "ar", path: "/", expected: "ar" },
  {
    primary: "ar",
    secondary: "en",
    saved: "ar",
    path: "/en/projects/bs-store",
    expected: "en",
  },
  {
    primary: "en-US",
    secondary: "ar",
    saved: "en",
    path: "/ar/projects/hsa",
    expected: "ar",
  },
];
for (const c of languageCases)
  test(`Language priority ${c.primary}/${c.saved}/${c.path}`, async ({
    page,
  }) => {
    await page.addInitScript(({ primary, secondary, saved }) => {
      Object.defineProperty(navigator, "languages", {
        get: () => [primary, secondary],
      });
      Object.defineProperty(navigator, "language", { get: () => primary });
      if (saved) localStorage.setItem("ammar-language", saved);
    }, c);
    await page.goto(c.path);
    await expect(page).toHaveURL(new RegExp(`/${c.expected}(?:/|$)`));
    await expect(page.locator("html")).toHaveAttribute("lang", c.expected);
    await expect(page.locator("html")).toHaveAttribute(
      "dir",
      c.expected === "ar" ? "rtl" : "ltr",
    );
  });

test("Unavailable local storage keeps language and appearance controls usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "languages", { get: () => ["ar-YE"] });
    Storage.prototype.getItem = () => {
      throw new Error("Storage disabled");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage disabled");
    };
  });
  await page.goto("/");
  await expect(page).toHaveURL(/\/ar$/);
  await page.getByRole("link", { name: "Switch to English" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await page.getByRole("button", { name: dictionaries.en.theme }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    /light|dark/,
  );
});

test("Language switch preserves project and section; preference survives root visits", async ({
  page,
}) => {
  await page.goto("/ar/projects/bs-store");
  await page.getByRole("link", { name: "Switch to English" }).click();
  await expect(page).toHaveURL(/\/en\/projects\/bs-store$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("BS Store");
  await page.goto("/ar#about");
  await page.getByRole("link", { name: "Switch to English" }).click();
  await expect(page).toHaveURL(/\/en#about$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
});

test("System appearance, manual choice and saved choice", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: dictionaries.en.theme }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

for (const lang of ["ar", "en"] as const)
  for (const theme of ["light", "dark"] as const)
    for (const width of [320, 375, 768, 1024, 1440]) {
      test(`Reflow, navigation and visuals ${lang}/${theme}/${width}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(
          (theme) => localStorage.setItem("ammar-theme", theme),
          theme,
        );
        await page.goto(`/${lang}`);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "Homepage fits viewport",
        ).toBe(true);
        await expect(page.locator(".project-card")).toHaveCount(5);
        if (width <= 375) {
          const button = page.locator(".menu-toggle");
          await button.click();
          await expect(button).toHaveAttribute("aria-expanded", "true");
          await page.keyboard.press("Escape");
          await expect(button).toHaveAttribute("aria-expanded", "false");
          await expect(button).toBeFocused();
        }
        if (width === 375 || width === 1440) {
          await mkdir(".local/screenshots", { recursive: true });
          await page.screenshot({
            path: `.local/screenshots/home-${lang}-${theme}-${width}.png`,
            fullPage: true,
          });
        }
        await page.goto(`/${lang}/projects/graduation`);
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "Project page fits viewport",
        ).toBe(true);
        await expect(page.locator("main h1")).toHaveText(
          projects[2].copy[lang].title,
        );
        const screenshot = page.locator(".project-screenshot img");
        await screenshot.scrollIntoViewIfNeeded();
        await expect(screenshot).toBeVisible();
        await expect
          .poll(() =>
            screenshot.evaluate(
              (image) => (image as HTMLImageElement).naturalWidth,
            ),
          )
          .toBeGreaterThan(0);
        if (width === 375 || width === 1440)
          await page.screenshot({
            path: `.local/screenshots/project-${lang}-${theme}-${width}.png`,
            fullPage: true,
          });
      });
    }

for (const lang of ["ar", "en"] as const)
  for (const theme of ["light", "dark"] as const)
    test(`WCAG automated audit ${lang}/${theme}`, async ({ page }) => {
      await page.addInitScript(
        (theme) => localStorage.setItem("ammar-theme", theme),
        theme,
      );
      await page.goto(`/${lang}`);
      await page.evaluate(() => document.fonts.ready);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        results.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
      await page.goto(`/${lang}/projects/hsa`);
      const projectResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        projectResults.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
    });

test("Email form validates, copies and opens a draft without claiming delivery", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/ar#contact");
  await page.getByRole("button", { name: dictionaries.ar.mailButton }).click();
  await expect(page.getByRole("alert")).toBeFocused();
  await expect(page.locator("[aria-invalid=true]")).toHaveCount(4);
  await page
    .getByLabel(dictionaries.ar.nameLabel, { exact: true })
    .fill("زائر للتجربة");
  await page
    .getByLabel(dictionaries.ar.emailField, { exact: true })
    .fill("visitor@test.invalid");
  await page
    .getByLabel(dictionaries.ar.kindLabel, { exact: true })
    .selectOption("freelance");
  await page
    .getByLabel(dictionaries.ar.messageLabel, { exact: true })
    .fill("أود مناقشة تطبيق ويب وموبايل يدعم العربية & English.");
  await page
    .getByRole("button", { name: dictionaries.ar.copy, exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText(dictionaries.ar.copied);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "العربية & English.",
  );
  await page.getByRole("button", { name: dictionaries.ar.mailButton }).click();
  await expect(page.getByRole("status")).toHaveText(dictionaries.ar.mailOpened);
  await expect(page.locator("#prepared-message")).toHaveValue(/زائر للتجربة/);
  const mail = prepareContact(
    {
      name: "عمار\nTest",
      email: "user@test.invalid",
      kind: "job",
      message: "مرحبًا & test? + #",
    },
    dictionaries.ar,
  );
  const url = new URL(mail.mailto);
  expect(url.searchParams.get("body")).toContain("مرحبًا & test? + #");
  expect(url.searchParams.get("subject")).not.toContain("\n");
});

test("Clipboard failure offers a selectable draft", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("Unavailable")) },
    });
  });
  await page.goto("/en#contact");
  await page.locator("#name").fill("Visitor");
  await page.locator("#email").fill("visitor@test.invalid");
  await page.locator("#kind").selectOption("other");
  await page
    .locator("#message")
    .fill("I would like to discuss an application.");
  await page
    .getByRole("button", { name: dictionaries.en.copy, exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText(dictionaries.en.copyError);
  await expect(page.locator("#prepared-message")).toBeVisible();
});

test("Keyboard skip link and mobile disclosure", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/en");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: dictionaries.en.skip }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
  await page
    .getByRole("button", { name: dictionaries.en.menu, exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-navigation a").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: dictionaries.en.menu, exact: true }),
  ).toBeFocused();
  await page.locator(".menu-toggle").click();
  await page.locator("#main-navigation a").first().press("Enter");
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator("#work h2")).toBeFocused();
});

test("Reduced motion and 200 percent zoom preserve readable content", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ar");
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setDeviceMetricsOverride", {
    width: 720,
    height: 450,
    deviceScaleFactor: 2,
    mobile: false,
  });
  // A 720 CSS-pixel viewport is the reflow equivalent of 1440px at 200% desktop zoom.
  await page.setViewportSize({ width: 720, height: 900 });
  await expect(page.locator("main h1")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () =>
        document.getAnimations().filter((a) => a.playState === "running")
          .length,
    ),
  ).toBe(0);
});

test("All ten project pages render real HTML without JavaScript and correct source links", async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const lang of ["ar", "en"] as const)
    for (const project of projects) {
      const path = `/${lang}/projects/${project.slug}`;
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(html).toContain(project.copy[lang].summary);
      expect(html).toContain("application/ld+json");
      expect(html).toContain(`lang="${lang}"`);
      await page.goto("http://127.0.0.1:5173" + path);
      await expect(page.locator("main h1")).toHaveText(
        project.copy[lang].title,
      );
      if (!project.publicRepo) {
        await expect(page.locator(".project-links")).toContainText(
          dictionaries[lang].privateRepo,
        );
        await expect(page.locator(".project-links a")).toHaveCount(0);
      } else
        await expect(
          page.locator(`.project-links a[href="${project.publicRepo}"]`),
        ).toBeVisible();
    }
  await context.close();
});
