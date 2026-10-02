import { Pool } from "pg";
const globalDb = globalThis as unknown as { transportPool?: Pool };
export const pool =
  globalDb.transportPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
globalDb.transportPool = pool;
