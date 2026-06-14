import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is required for Drizzle");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  tablesFilter: [
    "users",
    "sessions",
    "conversations",
    "messages",
    "user_character_state",
    "user_points",
  ],
  dbCredentials: {
    url,
  },
});
