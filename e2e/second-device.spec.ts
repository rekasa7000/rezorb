import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PASSWORD, createSpace, dismissNotice, email, newDevice, signUp } from "./helpers";

const PIN = "482913";

test("open on another device: the link carries the Space name through sign-in, never the PIN", async ({ browser }) => {
  const mail = email("qr");
  const a = await newDevice(browser);
  await signUp(a.page, mail);
  await createSpace(a.page, "Work swap", PIN);

  // The empty Space offers it as the obvious next step.
  await a.page.getByTestId("empty-open-other-device").click();
  const dialog = a.page.getByRole("dialog", { name: "Open on another device" });
  await expect(dialog.getByTestId("other-device-qr").locator("svg")).toBeVisible();
  const url = (await dialog.getByTestId("other-device-url").textContent())!.trim();
  expect(url).toContain("/spaces?space=Work%20swap");
  expect(url).not.toContain(PIN); // the PIN is never part of the link
  expect(url).not.toMatch(/pin/i);

  const r = await new AxeBuilder({ page: a.page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);

  // Also reachable from the header once the Space has Drops.
  await a.page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await a.page.getByTestId("open-other-device").click();
  await expect(a.page.getByRole("dialog", { name: "Open on another device" })).toBeVisible();

  // Device B follows the link: sent to sign-in, then back with the name filled in.
  const b = await newDevice(browser);
  await b.page.goto(url);
  await expect(b.page).toHaveURL(/\/sign-in\?next=/);
  await b.page.getByLabel("Email").fill(mail);
  await b.page.getByLabel("Password").fill(PASSWORD);
  await b.page.getByRole("button", { name: "Sign in", exact: true }).click();
  await b.page.waitForURL(/\/spaces\?space=Work%20swap/);
  await dismissNotice(b.page);
  await expect(b.page.getByTestId("space-name-input")).toHaveValue("Work swap");

  // Only the PIN is left to type.
  await b.page.getByTestId("pin-input").first().fill(PIN);
  await b.page.getByTestId("enter-space").click();
  await b.page.waitForURL("**/s/*");
  await expect(b.page.getByTestId("space-title")).toContainText("Work swap");

  await a.ctx.close();
  await b.ctx.close();
});

test("a hostile ?space= value is shown as plain text and nothing is injected", async ({ browser }) => {
  const a = await newDevice(browser);
  await signUp(a.page, email("xss"));
  const evil = '<img src=x onerror="window.__pwned=1">';
  await a.page.goto(`/spaces?space=${encodeURIComponent(evil)}`);
  await expect(a.page.getByTestId("space-name-input")).toHaveValue(evil);
  expect(await a.page.locator('img[src="x"]').count()).toBe(0);
  expect(await a.page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();

  // And it is bounded: an enormous value is cut to the 40-character limit, not rendered whole.
  await a.page.goto(`/spaces?space=${"a".repeat(500)}`);
  const v = await a.page.getByTestId("space-name-input").inputValue();
  expect(v.length).toBeLessThanOrEqual(40);
  await a.ctx.close();
});
