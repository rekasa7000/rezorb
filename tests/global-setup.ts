import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import fs from "node:fs";
import path from "node:path";

const url = "postgres://rezorb:rezorb@localhost:5432/rezorb_test";

export default async function setup() {
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: path.resolve("src/server/db/migrations") });
    await pool.query(
      `truncate table "pairing", "passkey", "space_grant", "drop", "space", "session", "device", "account", "verification", "user" restart identity cascade`,
    );
  } finally {
    await pool.end();
  }
  return () => {
    fs.rmSync(path.resolve(".dev-storage"), { recursive: true, force: true });
  };
}
