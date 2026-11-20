import { expect, test } from "@playwright/test";

/** The 3D landing hero must be an enhancement only: off in Calm, off for reduced motion, off on phones. */

const watch = (page: import("@playwright/test").Page) => {
  const bad: string[] = [];
  page.on("pageerror", (e) => bad.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" || /THREE\.WebGLProgram|shader|Error creating WebGL/i.test(t)) bad.push(`${m.type()}: ${t.slice(0, 200)}`);
  });
  return bad;
};

test("desktop: the three.js hero mounts, has a real canvas, and logs no shader errors", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const bad = watch(page);
  await page.goto("/");
  const canvas = page.getByTestId("hero-scene").locator("canvas");
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  // R3F starts at 300×150 and resizes on the next frame, so poll rather than sample once.
  await expect.poll(async () => (await canvas.boundingBox())?.width ?? 0).toBeGreaterThan(1000); // full-bleed
  await page.waitForTimeout(1500); // let a few frames (and any shader compile) run
  expect(bad).toEqual([]);
  // It's decorative: hidden from assistive tech.
  await expect(page.getByTestId("hero-backdrop")).toHaveAttribute("aria-hidden", "true");
  await ctx.close();
});

test("Calm mode: no 3D scene is mounted at all (not merely hidden), and the flat planet remains", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem("rz-prefs", JSON.stringify({ theme: "dark", calm: true, view: "grid", noticeAccepted: true })));
  const page = await ctx.newPage();
  await page.goto("/");
  await page.waitForTimeout(2500);
  await expect(page.getByTestId("hero-scene")).toHaveCount(0);
  expect(await page.locator("canvas").count()).toBe(0); // not even the 2D starfield
  await ctx.close();
});

test("prefers-reduced-motion: no 3D scene", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.waitForTimeout(2500);
  await expect(page.getByTestId("hero-scene")).toHaveCount(0);
  await ctx.close();
});

test("phone viewport: no 3D scene and no horizontal overflow", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.waitForTimeout(2500);
  await expect(page.getByTestId("hero-scene")).toHaveCount(0);
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw).toBeLessThanOrEqual(iw);
  await ctx.close();
});

test("the wordmark swaps to ink art on Daylight and the logo SVGs are served", async ({ browser, request }) => {
  for (const f of ["rezorb-wordmark", "rezorb-wordmark-ink", "rezorb-editorial", "rezorb-mark", "rezorb-stacked"]) {
    const r = await request.get(`/brand/${f}.svg`);
    expect(r.status(), f).toBe(200);
    expect(await r.text()).toContain("<svg");
  }
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => localStorage.setItem("rz-prefs", JSON.stringify({ theme: "light", calm: false, view: "grid", noticeAccepted: true })));
  const page = await ctx.newPage();
  await page.goto("/sign-in");
  const dark = page.locator(".logo-dark").first();
  const light = page.locator(".logo-light").first();
  await expect(light).toBeVisible();
  await expect(dark).toBeHidden();
  await ctx.close();
});
