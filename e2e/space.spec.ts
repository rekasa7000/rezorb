import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PNG_B64, createSpace, dismissNotice, email, enterPin, newDevice, signIn, signUp, unlock } from "./helpers";

test.describe.configure({ mode: "serial" });

const PIN = "482913";

test("the magic moment: paste on one device, catch it on the other", async ({ browser }) => {
  const mail = email("magic");
  const a = await newDevice(browser, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36");
  const b = await newDevice(browser, "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15");

  await signUp(a.page, mail);
  await createSpace(a.page, "Work swap", PIN);

  await signIn(b.page, mail);
  await unlock(b.page, "work swap", PIN); // names are case-insensitive
  await expect(b.page.getByText("Nothing in orbit.")).toBeVisible();

  // A: type into the Dock and press Enter.
  const text = "The answer from the AI: use a map, then filter.";
  await a.page.getByTestId("dock-input").fill(text);
  const t0 = Date.now();
  await a.page.getByTestId("dock-input").press("Enter");
  await expect(a.page.getByTestId("drop-card")).toHaveCount(1);

  // B: it appears without a refresh (polling fallback here: no Ably key in e2e).
  await expect(b.page.getByTestId("drop-text")).toHaveText(text, { timeout: 8000 });
  console.log(`time-to-catch (polling mode): ${Date.now() - t0}ms`);

  // B: press `c` to copy the latest drop to the clipboard.
  await b.page.locator("body").click({ position: { x: 5, y: 300 } });
  await b.page.keyboard.press("c");
  await expect.poll(() => b.page.evaluate(() => navigator.clipboard.readText())).toBe(text);

  // B shows where it came from.
  await expect(b.page.getByTestId("drop-card").first()).toContainText("Chrome on Windows");

  // Page-wide paste on B (no focus in an input) beams it back to A.
  await b.page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData("text/plain", "pasted from B");
    document.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect(a.page.getByText("pasted from B")).toBeVisible({ timeout: 8000 });

  await a.ctx.close();
  await b.ctx.close();
});

test("a pasted screenshot becomes an image drop on the other device; files round-trip byte-for-byte", async ({ browser }) => {
  const mail = email("files");
  const a = await newDevice(browser);
  const b = await newDevice(browser);
  await signUp(a.page, mail);
  await createSpace(a.page, "Cargo", PIN);
  await signIn(b.page, mail);
  await unlock(b.page, "Cargo", PIN);

  // Screenshot paste (synthetic ClipboardEvent carrying a PNG file).
  await a.page.evaluate((b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], "image.png", { type: "image/png" }));
    document.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, PNG_B64);
  await expect(a.page.locator('[data-drop-card] img')).toBeVisible({ timeout: 10_000 });
  await expect(b.page.locator('[data-drop-card] img')).toBeVisible({ timeout: 10_000 });

  // A file via the attach input, then download it on B and compare hashes.
  const data = Buffer.alloc(300_000);
  for (let i = 0; i < data.length; i++) data[i] = (i * 31 + 7) % 251;
  await a.page.getByTestId("file-input").setInputFiles({ name: "report.pdf", mimeType: "application/pdf", buffer: data });
  const card = b.page.locator('[data-drop-card]', { hasText: "report.pdf" });
  await expect(card).toBeVisible({ timeout: 10_000 });
  const [download] = await Promise.all([b.page.waitForEvent("download"), card.getByTestId("download-btn").click()]);
  expect(download.suggestedFilename()).toBe("report.pdf");
  const path = await download.path();
  const got = (await import("node:fs")).readFileSync(path!);
  expect(createHash("sha256").update(got).digest("hex")).toBe(createHash("sha256").update(data).digest("hex"));

  await a.ctx.close();
  await b.ctx.close();
});

test("a Space seals after five wrong PINs and shows a live countdown", async ({ browser }) => {
  const mail = email("seal");
  const a = await newDevice(browser);
  await signUp(a.page, mail);
  await createSpace(a.page, "Locked box", PIN);
  await a.page.getByTestId("lock-btn").click();
  await a.page.waitForURL("**/spaces");

  await a.page.getByTestId("space-name-input").fill("Locked box");
  for (let i = 0; i < 4; i++) {
    await enterPin(a.page, "000111");
    await a.page.getByTestId("enter-space").click();
    await expect(a.page.getByRole("alert").filter({ hasText: /tr(y|ies) left/ })).toContainText(`${4 - i} ${4 - i === 1 ? "try" : "tries"} left`);
  }
  await enterPin(a.page, "000111");
  await a.page.getByTestId("enter-space").click();
  await expect(a.page.getByTestId("seal-countdown")).toBeVisible();
  await expect(a.page.getByTestId("seal-countdown")).toHaveText(/^00:1[45]:\d\d$/);
  await expect(a.page.getByTestId("enter-space")).toBeDisabled();

  await a.ctx.close();
});

test("changing the PIN drops the other device to the PIN screen", async ({ browser }) => {
  const mail = email("pinchg");
  const a = await newDevice(browser);
  const b = await newDevice(browser);
  await signUp(a.page, mail);
  await createSpace(a.page, "Shared", PIN);
  await signIn(b.page, mail);
  await unlock(b.page, "Shared", PIN);
  await expect(b.page.getByTestId("space-title")).toBeVisible();

  await a.page.getByTestId("space-settings").click();
  const dlg = a.page.getByRole("dialog");
  await dlg.getByTestId("pin-input").nth(0).fill(PIN);
  await dlg.getByTestId("pin-input").nth(1).fill("907316");
  await dlg.getByRole("button", { name: "Change PIN" }).click();
  await expect(a.page.getByText(/PIN changed/)).toBeVisible();

  // B finds out on its next poll and lands on the PIN gate.
  await expect(b.page.getByText("Locked Space")).toBeVisible({ timeout: 10_000 });
  await enterPin(b.page, PIN); // the old PIN no longer works
  await b.page.getByTestId("enter-space").click();
  await expect(b.page.getByRole("alert").filter({ hasText: /didn't open/ })).toBeVisible();
  await enterPin(b.page, "907316");
  await b.page.getByTestId("enter-space").click();
  await expect(b.page.getByTestId("space-title")).toBeVisible();

  await a.ctx.close();
  await b.ctx.close();
});

test("revoking a device signs it out", async ({ browser }) => {
  const mail = email("revoke");
  const a = await newDevice(browser, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36");
  const b = await newDevice(browser, "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0");
  await signUp(a.page, mail);
  await createSpace(a.page, "Keep", PIN);
  await signIn(b.page, mail);
  await unlock(b.page, "Keep", PIN);

  await a.page.goto("/settings");
  await a.page.getByRole("tab", { name: "Devices" }).click();
  const row = a.page.getByTestId("device-row").filter({ hasText: "Firefox" });
  await expect(row).toBeVisible();
  a.page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Revoke" }).click();
  await expect(a.page.getByTestId("device-row")).toHaveCount(1);

  await b.page.waitForURL("**/sign-in**", { timeout: 12_000 });
  await b.page.goto("/spaces");
  await expect(b.page).toHaveURL(/sign-in/);

  await a.ctx.close();
  await b.ctx.close();
});

test("sign in a new device with a code, no password typed on it", async ({ browser }) => {
  const mail = email("pair");
  const a = await newDevice(browser);
  const work = await newDevice(browser, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/126.0 Chrome/126.0 Safari/537.36");
  await signUp(a.page, mail);

  await work.page.goto("/pair");
  const code = (await work.page.getByTestId("pair-code").textContent())!.trim();
  expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

  await a.page.goto("/link");
  await a.page.getByPlaceholder("XXXX-XXXX").fill(code);
  await a.page.getByRole("button", { name: "Continue" }).click();
  await expect(a.page.getByText(/Only approve if you are looking at this code/)).toBeVisible();
  await a.page.getByRole("button", { name: "Approve" }).click();
  await expect(a.page.getByText(/Approved/)).toBeVisible();

  await work.page.waitForURL("**/spaces", { timeout: 10_000 });
  await expect(work.page.getByText("Before you start")).toBeVisible(); // new device sees the one-time notice
  await dismissNotice(work.page);
  await work.page.goto("/settings");
  await work.page.getByRole("tab", { name: "Devices" }).click();
  await expect(work.page.getByTestId("device-row")).toHaveCount(2);

  await a.ctx.close();
  await work.ctx.close();
});

test("Calm mode removes the cosmos layers and all animation", async ({ browser }) => {
  const mail = email("calm");
  const a = await newDevice(browser);
  await signUp(a.page, mail);
  await createSpace(a.page, "Quiet", PIN);
  await a.page.getByTestId("dock-input").fill("hello");
  await a.page.getByTestId("dock-input").press("Enter");
  await expect(a.page.getByTestId("drop-card")).toHaveCount(1);

  await expect(a.page.locator(".cosmos")).toBeVisible();
  await a.page.keyboard.press("Shift+C"); // focus is in the Dock? blur first
  await a.page.locator("body").click({ position: { x: 5, y: 300 } });
  await a.page.keyboard.press("Shift+C");
  await expect(a.page.locator("html")).toHaveAttribute("data-calm", "true");
  await expect(a.page.locator(".cosmos")).toBeHidden();
  // DESIGN §10.1: Calm keeps one thing, a ≤120ms opacity fade. Everything else must not animate.
  const forbiddenRunning = () =>
    a.page.evaluate(() =>
      document
        .getAnimations()
        .filter((x) => x.playState === "running")
        .filter((x) => {
          const t = x.effect?.getTiming();
          const isOpacityFade = x instanceof CSSTransition && x.transitionProperty === "opacity" && Number(t?.duration ?? 0) <= 120;
          return !isOpacityFade;
        })
        .map((x) => `${x.constructor.name}:${(x as CSSTransition).transitionProperty ?? (x as CSSAnimation).animationName ?? "waapi"}`),
    );
  // Anything already in flight when Calm was switched on (the entrance spring) may finish…
  await expect.poll(forbiddenRunning, { timeout: 3000 }).toEqual([]);
  // …but nothing started in Calm mode animates: a new Drop appears with no forbidden animation.
  await a.page.getByTestId("dock-input").fill("second");
  await a.page.getByTestId("dock-input").press("Enter");
  await expect(a.page.getByTestId("drop-card")).toHaveCount(2);
  expect(await forbiddenRunning()).toEqual([]);

  // It's per-device and persists.
  await a.page.reload();
  await expect(a.page.locator("html")).toHaveAttribute("data-calm", "true");
  await a.ctx.close();
});

test("keyboard-only: focus the Dock, beam, move focus, copy", async ({ browser }) => {
  const mail = email("kbd");
  const a = await newDevice(browser);
  await signUp(a.page, mail);
  await createSpace(a.page, "Keys", PIN);
  await a.page.locator("body").click({ position: { x: 5, y: 300 } });
  await a.page.keyboard.press("/");
  await a.page.keyboard.type("typed with the keyboard");
  await a.page.keyboard.press("Enter");
  await expect(a.page.getByTestId("drop-text")).toHaveText("typed with the keyboard");
  await a.page.locator("body").click({ position: { x: 5, y: 300 } });
  await a.page.keyboard.press("j");
  await expect(a.page.getByTestId("drop-card")).toBeFocused();
  await a.page.keyboard.press("Enter");
  await expect.poll(() => a.page.evaluate(() => navigator.clipboard.readText())).toBe("typed with the keyboard");
  await a.ctx.close();
});

test("accessibility: no axe violations on the main screens", async ({ browser }) => {
  const mail = email("a11y");
  const a = await newDevice(browser);
  const scan = async (label: string) => {
    const r = await new AxeBuilder({ page: a.page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const bad = r.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
    expect(bad, `${label}\n${bad.join("\n")}`).toEqual([]);
  };
  await a.page.goto("/");
  await a.page.emulateMedia({ reducedMotion: "reduce" });
  await expect(a.page.getByRole("group", { name: "Example Drops" }).locator("article")).toHaveCount(3); // rendered on the client
  await scan("landing");
  await a.page.goto("/sign-in");
  await scan("sign-in");
  await a.page.goto("/sign-up");
  await scan("sign-up");
  await signUp(a.page, mail);
  await scan("launchpad");
  await createSpace(a.page, "Axe", PIN);
  await a.page.getByTestId("dock-input").fill("some text");
  await a.page.getByTestId("dock-input").press("Enter");
  await expect(a.page.getByTestId("drop-card")).toHaveCount(1);
  // A syntax-highlighted code Drop (keyword colours are where contrast tends to fail).
  await a.page.getByTestId("dock-input").fill("def add(a, b):\n    return a + b\n\nprint(add(1, 2))");
  await a.page.getByTestId("dock-input").press("Enter");
  await expect(a.page.getByTestId("drop-card")).toHaveCount(2);
  await expect(a.page.locator("article pre.shiki").first()).toBeVisible(); // highlighting has applied
  await scan("space");
  await a.page.goto("/settings");
  await scan("settings");

  // Daylight theme gets the same scan: its tokens are separate (DESIGN §3.4).
  await a.page.evaluate(() => localStorage.setItem("rz-prefs", JSON.stringify({ theme: "light", calm: false, view: "grid", noticeAccepted: true })));
  for (const path of ["/", "/sign-in", "/spaces", "/settings"]) {
    await a.page.goto(path);
    await expect(a.page.locator("html")).toHaveAttribute("data-theme", "light");
    if (path === "/") await expect(a.page.getByRole("group", { name: "Example Drops" }).locator("article")).toHaveCount(3);
    await scan(`${path} (Daylight)`);
  }
  await a.page.goto("/spaces");
  await a.page.getByTestId("space-card").first().click();
  await a.page.waitForURL("**/s/*");
  await expect(a.page.getByTestId("drop-card")).toHaveCount(2);
  await expect(a.page.locator("article pre.shiki").first()).toBeVisible();
  await scan("space (Daylight)");
  await a.ctx.close();
});
