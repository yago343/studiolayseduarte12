import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Fix Supabase bracket-encoded passwords: [password@with@symbols] -> URL-encoded
connectionString = connectionString.replace(/:(\[.*?\])@/, (_, bracketed) => {
  const inner = bracketed.slice(1, -1).replace(/@/g, "%40");
  return `:${inner}@`;
});

export const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
export const db = drizzle(pool, { schema });

export * from "./schema";
