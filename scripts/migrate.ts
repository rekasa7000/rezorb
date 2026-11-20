import "dotenv/config";
import { config } from "dotenv";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";

config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    // Allow `pnpm build:vercel` in an environment without a database (e.g. first deploy).
    console.warn("[migrate] No DATABASE_URL set; skipping migrations.");
    return;
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: path.resolve("src/server/db/migrations") });
    console.log("[migrate] done");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("[migrate] failed", e);
  process.exit(1);
});
