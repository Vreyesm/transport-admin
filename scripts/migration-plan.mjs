const loopback = (host) => ["localhost", "127.0.0.1", "[::1]"].includes(host);

export function migrationPlan(env) {
  const apiUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const databaseUrl = env.SUPABASE_DB_URL;
  if (!apiUrl && !apiKey && !databaseUrl) return null;
  if (!apiUrl || !apiKey || !databaseUrl) {
    throw new Error(
      "Configura NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_DB_URL para aplicar migraciones antes de iniciar.",
    );
  }
  let api, db;
  try {
    api = new URL(apiUrl);
    db = new URL(databaseUrl);
  } catch {
    throw new Error("La configuración de conexión no contiene URLs válidas.");
  }
  if (!["postgres:", "postgresql:"].includes(db.protocol)) {
    throw new Error("SUPABASE_DB_URL debe ser una conexión PostgreSQL.");
  }
  for (const key of db.searchParams.keys()) {
    if (key !== "sslmode") {
      throw new Error(
        "SUPABASE_DB_URL solo admite sslmode como parámetro; configura usuario, host, puerto y base en la URL.",
      );
    }
  }
  if (db.hostname.endsWith(".pooler.supabase.com") && db.port === "6543") {
    throw new Error(
      "Usa el session pooler (puerto 5432) para migraciones, no el transaction pooler.",
    );
  }
  const local =
    loopback(api.hostname) &&
    (loopback(db.hostname) || db.hostname === "supabase_db_transport-admin");
  const ref = api.hostname.endsWith(".supabase.co")
    ? api.hostname.slice(0, -".supabase.co".length)
    : null;
  const matches =
    ref &&
    (db.hostname === `db.${ref}.supabase.co` ||
      (db.hostname.endsWith(".pooler.supabase.com") &&
        decodeURIComponent(db.username) === `postgres.${ref}`));
  if (!local && !matches) {
    throw new Error(
      "La conexión de migraciones debe apuntar al mismo proyecto Supabase que la aplicación (o ambos a localhost).",
    );
  }
  if (local && !db.searchParams.has("sslmode")) {
    db.searchParams.set("sslmode", "disable");
  }
  if (!local) {
    if (
      db.searchParams.has("sslmode") &&
      !["require", "verify-ca", "verify-full"].includes(
        db.searchParams.get("sslmode"),
      )
    ) {
      throw new Error(
        "La conexión remota de migraciones requiere TLS (sslmode=require).",
      );
    }
    if (!db.searchParams.has("sslmode"))
      db.searchParams.set("sslmode", "require");
  }
  const password = db.password
    ? decodeURIComponent(db.password)
    : env.SUPABASE_DB_PASSWORD;
  if (!password)
    throw new Error(
      "Configura la contraseña privada de PostgreSQL para las migraciones.",
    );
  db.password = "";
  return {
    args: ["db", "push", "--db-url", db.toString(), "--yes"],
    password,
  };
}

export function redact(text, secrets) {
  for (const secret of secrets.filter(Boolean)) {
    text = text.split(secret).join("[REDACTADO]");
    text = text.split(encodeURIComponent(secret)).join("[REDACTADO]");
  }
  return text;
}
