import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { email, newDevice, signUp } from "./helpers";

const scan = async (page: import("@playwright/test").Page, label: string) => {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const bad = r.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(bad, `${label}\n${bad.join("\n")}`).toEqual([]);
};

test("forgot password: reachable from sign-in, and answers the same for any address", async ({ browser }) => {
  const { ctx, page } = await newDevice(browser);
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page).toHaveURL(/forgot-password/);
  await scan(page, "forgot-password (form)");

  // A real-looking but unknown address gets the same confirmation as a real one would.
  await page.getByLabel("Email").fill(`nobody-${Date.now()}@example.test`);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByText(/If an account exists for that address/)).toBeVisible();
  await scan(page, "forgot-password (sent)");
  await ctx.close();
});

test("reset password: a missing or bad link explains itself, a bad token is refused", async ({ browser }) => {
  const { ctx, page } = await newDevice(browser);

  await page.goto("/reset-password");
  await expect(page.getByRole("heading", { name: "That link didn't work" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Send a new link" })).toBeVisible();
  await scan(page, "reset-password (no token)");

  await page.goto("/reset-password?error=INVALID_TOKEN");
  await expect(page.getByRole("heading", { name: "That link didn't work" })).toBeVisible();

  // A token that looks plausible but was never issued: the form shows, the server refuses.
  await page.goto("/reset-password?token=forged-token-value");
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  await scan(page, "reset-password (form)");
  await page.getByLabel("New password").fill("short");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText(/at least 10 characters|A bit longer/i).first()).toBeVisible();
  await page.getByLabel("New password").fill("a perfectly long passphrase 1");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("alert").or(page.getByText(/invalid|expired/i)).first()).toBeVisible();
  await expect(page).toHaveURL(/reset-password/); // not sent on to sign-in

  await ctx.close();
});

test("a signed-in user visiting forgot-password is sent to settings, not shown the form", async ({ browser }) => {
  const { ctx, page } = await newDevice(browser);
  await signUp(page, email("signedin"));
  await page.goto("/forgot-password");
  await expect(page).toHaveURL(/settings/);
  await ctx.close();
});

test("every signed-in page sends an anonymous visitor to sign-in and remembers where they were going", async ({ browser }) => {
  const { ctx, page } = await newDevice(browser);
  // If a new page in the (app) group forgets its guard, it will show up here as a failure.
  const protectedPaths = ["/spaces", "/spaces?space=Work%20swap", "/settings", "/link", "/link?code=ABCD-EFGH", "/s/abc123XYZ9"];
  for (const path of protectedPaths) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/sign-in\?next=/);
    const next = new URL(page.url()).searchParams.get("next");
    expect(next, path).toBe(path);
  }
  await ctx.close();
});
