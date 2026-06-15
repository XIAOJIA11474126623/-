import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

function normalizePostgresUrl(url: string) {
  if (url.includes("://")) {
    return url;
  }

  return `postgresql://${url}`;
}

export const pool = new Pool({
  connectionString: normalizePostgresUrl(connectionString),
  ssl: true,
});

export const db = drizzle(pool, { schema });
