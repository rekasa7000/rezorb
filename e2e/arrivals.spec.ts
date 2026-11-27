import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createSpace, email, newDevice, signIn, signUp, unlock } from "./helpers";

const PIN = "482913";

test("a Drop that lands while the tab is hidden shows up in the tab title, and clears when you come back", async ({ browser }) => {
  const mail = email("title");
  const a = await newDevice(browser);
  const b = await newDevice(browser);
  await signUp(a.page, mail);
  await createSpace(a.page, "Cargo", PIN);
  await signIn(b.page, mail);
  await unlock(b.page, "Cargo", PIN);

  // Make B's tab look hidden.
  await b.page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await a.page.getByTestId("dock-input").fill("one");
  await a.page.getByTestId("dock-input").press("Enter");
  await expect.poll(() => b.page.title(), { timeout: 10000 }).toMatch(/^\(1\) Cargo/);

  await a.page.getByTestId("dock-input").fill("two");
  await a.page.getByTestId("dock-input").press("Enter");
  await expect.poll(() => b.page.title(), { timeout: 10000 }).toMatch(/^\(2\) Cargo/);

  // Back in the tab: the count goes away.
  await b.page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => b.page.title()).toBe("Space · Rezorb");

  await a.ctx.close();
  await b.ctx.close();
});

test("Settings shows storage, Space and device usage, and notifications are opt-in", async ({ browser }) => {
  const mail = email("meter");
  const a = await newDevice(browser);
  await signUp(a.page, mail);
  await createSpace(a.page, "Cargo", PIN);

  await a.page.goto("/settings");
  await a.page.getByRole("tab", { name: "Limits" }).click();
  await expect(a.page.getByTestId("meter-storage")).toContainText("0 B of 1.0 GB used");
  await expect(a.page.getByTestId("meter-spaces")).toContainText("1 of 10");
  await expect(a.page.getByTestId("meter-devices")).toContainText("1 of 10");
  const r = await new AxeBuilder({ page: a.page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);

  // Off until the user turns it on; nothing asks for permission on load.
  await a.page.getByRole("tab", { name: "Appearance" }).click();
  await expect(a.page.getByTestId("notify-toggle")).not.toBeChecked();

  await a.ctx.close();
});
