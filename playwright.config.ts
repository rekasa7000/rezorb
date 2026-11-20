import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    screenshot: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Optional: point at an existing Chromium (CI images, sandboxes) instead of `playwright install`.
        // Software WebGL (SwiftShader) so the three.js hero renders on machines without a GPU.
        launchOptions: {
          args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? ["--no-sandbox"] : [])],
          ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}),
        },
      },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
      DATABASE_URL: "postgres://rezorb:rezorb@localhost:5432/rezorb_test",
      DATABASE_URL_UNPOOLED: "postgres://rezorb:rezorb@localhost:5432/rezorb_test",
      BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-0000000",
      GRANT_SECRET: "e2e-grant-secret-e2e-grant-secret-0000",
      CRON_SECRET: "e2e-cron",
      // Runs the production build without R2/Resend. Refused on Vercel production (see env.ts).
      REZORB_E2E: "1",
    },
  },
});
