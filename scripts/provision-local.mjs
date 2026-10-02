import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

let input = "";
for await (const chunk of process.stdin) input += chunk;
const status = JSON.parse(input);
const api = new URL(status.API_URL);
if (!["localhost", "127.0.0.1", "[::1]"].includes(api.hostname)) {
  throw new Error("Solo se permite aprovisionar Supabase local.");
}
if (!status.ANON_KEY) {
  throw new Error("Faltan las claves de Supabase local.");
}
async function provisionAdmin() {
  if (!status.SERVICE_ROLE_KEY)
    throw new Error(
      "Falta la clave privada local para crear el administrador de prueba.",
    );
  const seed = JSON.parse(await readFile("supabase/seed-admin.json", "utf8"));
  const headers = {
    apikey: status.SERVICE_ROLE_KEY,
    Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
  async function request(path, options = {}) {
    const response = await fetch(new URL(path, api), { ...options, headers });
    if (!response.ok)
      throw new Error(`Auth local respondió HTTP ${response.status}`);
    return response.json();
  }
  let admin;
  for (let page = 1; ; page++) {
    const { users } = await request(
      `/auth/v1/admin/users?page=${page}&per_page=100`,
    );
    admin = users.find((user) => user.email === seed.email);
    if (admin || users.length < 100) break;
  }
  admin ??= await request("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(seed),
  });
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(admin.id)) {
    throw new Error("UUID de administrador inválido.");
  }
  execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_transport-admin",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `insert into public.admin_profiles(id) values ('${admin.id}') on conflict do nothing;`,
    ],
    { stdio: "inherit" },
  );
  console.log(`Administrador local disponible: ${seed.email}`);
}
if (process.argv.includes("--seed-admin")) await provisionAdmin();
await writeFile(
  ".env.docker.local",
  `NEXT_PUBLIC_SUPABASE_URL=${api.origin}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}\n`,
  { mode: 0o600 },
);
console.log(
  "Conexión local preparada; los seeds solo se cargan por solicitud explícita.",
);
