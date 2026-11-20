import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export const PASSWORD = "correct horse battery staple";
let n = 0;
export const email = (p = "e2e") => `${p}-${Date.now()}-${n++}@example.test`;

export async function newDevice(browser: Browser, ua?: string): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
    userAgent: ua,
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();
  return { ctx, page };
}

/** Dismisses the one-time workplace notice if it is showing. */
export async function dismissNotice(page: Page) {
  const ok = page.getByTestId("notice-ok");
  if (await ok.isVisible().catch(() => false)) await ok.click();
}

export async function signUp(page: Page, mail: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(mail);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/spaces");
  await dismissNotice(page);
}

export async function signIn(page: Page, mail: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(mail);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/spaces");
  await dismissNotice(page);
}

export async function enterPin(page: Page, pin: string) {
  await page.getByTestId("pin-input").first().fill(pin);
}

export async function createSpace(page: Page, name: string, pin: string) {
  await page.getByTestId("create-first").or(page.getByTestId("create-space")).click();
  await page.getByTestId("new-space-name").fill(name);
  await page.getByRole("dialog").getByTestId("pin-input").fill(pin);
  await page.getByTestId("create-space-submit").click();
  await page.waitForURL("**/s/*");
  await expect(page.getByTestId("space-title")).toContainText(name);
}

export async function unlock(page: Page, name: string, pin: string) {
  await page.getByTestId("space-name-input").fill(name);
  await enterPin(page, pin);
  await page.getByTestId("enter-space").click();
  await page.waitForURL("**/s/*");
}

// 1×1 transparent PNG
export const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
