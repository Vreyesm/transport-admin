import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { migrationPlan, redact } from "./migration-plan.mjs";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
try {
  const plan = migrationPlan(process.env);
  if (!plan) {
    console.log("Modo demostración: no se requieren migraciones.");
  } else {
    console.log("Aplicando migraciones pendientes; no se ejecutará el seed.");
    const cli = fileURLToPath(
      new URL("../node_modules/supabase/dist/supabase.js", import.meta.url),
    );
    const result = spawnSync(process.execPath, [cli, ...plan.args], {
      env: {
        ...process.env,
        SUPABASE_DB_PASSWORD: plan.password,
        PGPASSWORD: plan.password,
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120000,
      windowsHide: true,
    });
    const secrets = [
      plan.password,
      process.env.SUPABASE_DB_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      process.env.SUPABASE_ACCESS_TOKEN,
    ];
    process.stdout.write(redact(result.stdout || "", secrets));
    process.stderr.write(redact(result.stderr || "", secrets));
    if (result.error || result.status !== 0) {
      throw new Error(
        "No se completaron las migraciones. Se cancela el arranque. Revisa la conexión y el historial con Supabase CLI; no ejecutes reset ni marques migraciones como aplicadas sin comprobarlas.",
      );
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
