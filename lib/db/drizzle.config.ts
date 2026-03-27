import { defineConfig } from "drizzle-kit";
import path from "path";

let connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set");
}

// Fix Supabase bracket-encoded passwords: [password@with@symbols] -> URL-encoded
connectionString = connectionString.replace(/:(\[.*?\])@/, (_, bracketed) => {
  const inner = bracketed.slice(1, -1).replace(/@/g, "%40");
  return `:${inner}@`;
});

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: { rejectUnauthorized: false },
  },
});
