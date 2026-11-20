import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    include: ["src/**/*.int.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    env: {
      DATABASE_URL: "postgres://rezorb:rezorb@localhost:5432/rezorb_test",
      DATABASE_URL_UNPOOLED: "postgres://rezorb:rezorb@localhost:5432/rezorb_test",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-0000",
      GRANT_SECRET: "test-grant-secret-test-grant-secret-0000",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
  },
});
