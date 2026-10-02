import pg from "pg";
import { readFile, readdir } from "node:fs/promises";
import { randomBytes, scryptSync } from "node:crypto";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  await db.query("BEGIN");
  await db.query("select pg_advisory_xact_lock(726431)");
  await db.query(
    "create table if not exists public.schema_migrations(name text primary key)",
  );
  for (const name of (await readdir("database/migrations")).sort()) {
    if (
      !(
        await db.query("select 1 from public.schema_migrations where name=$1", [
          name,
        ])
      ).rowCount
    ) {
      await db.query(await readFile(`database/migrations/${name}`, "utf8"));
      await db.query("insert into public.schema_migrations values($1)", [name]);
    }
  }
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    if (process.env.ADMIN_PASSWORD.length < 12)
      throw new Error("ADMIN_PASSWORD debe tener al menos 12 caracteres.");
    const salt = randomBytes(16).toString("hex");
    const password =
      salt +
      ":" +
      scryptSync(process.env.ADMIN_PASSWORD, salt, 64).toString("hex");
    const result = await db.query(
      "insert into auth.users(email,password_hash) values(lower($1),$2) on conflict(email) do nothing returning id",
      [process.env.ADMIN_EMAIL, password],
    );
    if (result.rowCount)
      await db.query("insert into public.admin_profiles values($1)", [
        result.rows[0].id,
      ]);
  }
  await db.query("COMMIT");
} catch (error) {
  await db.query("ROLLBACK");
  throw error;
} finally {
  await db.end();
}
