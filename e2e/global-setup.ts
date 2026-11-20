import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

export default async function globalSetup() {
  const pool = new Pool({ connectionString: "postgres://rezorb:rezorb@localhost:5432/rezorb_test", max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: path.resolve("src/server/db/migrations") });
    await pool.query(`truncate table "pairing","passkey","space_grant","drop","space","session","device","account","verification","user" restart identity cascade`);
  } finally {
    await pool.end();
  }
  fs.rmSync(path.resolve(".dev-storage"), { recursive: true, force: true });
}
