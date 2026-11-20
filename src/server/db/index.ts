import "server-only";
import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { env } from "../env";

declare global {
  var __rezorbPool: Pool | undefined;
}

function createPool() {
  return new Pool({
    connectionString: env.databaseUrl,
    max: process.env.NODE_ENV === "production" ? 5 : 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
}

// Reuse the pool across hot reloads and warm serverless invocations.
const pool = (globalThis.__rezorbPool ??= createPool());

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { pool, schema };
