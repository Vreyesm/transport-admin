import { NextRequest, NextResponse } from "next/server";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { pool } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const cookie = "transport-session";
const fields: Record<string, string[]> = {
  vehicles: [
    "id",
    "name",
    "plate",
    "type",
    "brand",
    "model",
    "year",
    "capacity",
    "features",
    "notes",
    "archived",
    "photos",
    "version",
  ],
  occupations: [
    "id",
    "vehicle_id",
    "kind",
    "starts_at",
    "ends_at",
    "cancelled",
    "activity",
    "destination",
    "organization",
    "responsible",
    "contact",
    "notes",
    "version",
  ],
  settings: ["name", "color", "logo", "version"],
};
async function handle(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const route = path[0];
  if (
    req.method !== "GET" &&
    req.headers.get("origin") !==
      (process.env.APP_ORIGIN ||
        `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host")}`)
  )
    return NextResponse.json({ error: "Origen inv�lido." }, { status: 403 });
  const db = await pool.connect();
  const json = (data: unknown, status = 200) =>
    NextResponse.json(data, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  try {
    await db.query("BEGIN");
    const token = req.cookies.get(cookie)?.value;
    const session = token
      ? (
          await db.query(
            "select u.id from auth.sessions s join auth.users u on u.id=s.user_id join public.admin_profiles a on a.id=u.id where s.token_hash=$1 and s.expires_at>now() and u.enabled",
            [hash(token)],
          )
        ).rows[0]
      : null;
    if (route === "session") {
      if (req.method === "GET") {
        await db.query("COMMIT");
        return json({ user: session ?? null });
      }
      if (req.method === "DELETE") {
        if (token)
          await db.query("delete from auth.sessions where token_hash=$1", [
            hash(token),
          ]);
        await db.query("COMMIT");
        const res = json({ ok: true });
        res.cookies.delete(cookie);
        return res;
      }
      if (req.method !== "POST")
        return json({ error: "M�todo inv�lido." }, 405);
      const body = await req.json();
      if (
        typeof body.email !== "string" ||
        typeof body.password !== "string" ||
        body.password.length > 1024
      )
        return json({ error: "Credenciales inv�lidas." }, 400);
      const key = hash(body.email.toLowerCase());
      await db.query(
        "insert into auth.login_attempts(key,attempts) values($1,1) on conflict(key) do update set attempts=case when login_attempts.window_start<now()-interval '15 minutes' then 1 else login_attempts.attempts+1 end,window_start=case when login_attempts.window_start<now()-interval '15 minutes' then now() else login_attempts.window_start end",
        [key],
      );
      const attempts = Number(
        (
          await db.query(
            "select attempts from auth.login_attempts where key=$1",
            [key],
          )
        ).rows[0].attempts,
      );
      await db.query("COMMIT");
      await db.query("BEGIN");
      if (attempts > 10)
        return json(
          { error: "Demasiados intentos. Reintenta en 15 minutos." },
          429,
        );
      const user = (
        await db.query(
          "select u.* from auth.users u join public.admin_profiles a on a.id=u.id where lower(email)=lower($1) and enabled",
          [body.email],
        )
      ).rows[0];
      const [salt, expected] = (
        user?.password_hash ?? "dummy:" + "00".repeat(64)
      ).split(":");
      const actual = scryptSync(body.password, salt, 64);
      if (!user || !timingSafeEqual(actual, Buffer.from(expected, "hex")))
        return json({ error: "Credenciales inv�lidas." }, 401);
      const value = randomBytes(32).toString("hex");
      await db.query("delete from auth.sessions where expires_at<=now()");
      await db.query(
        "insert into auth.sessions values($1,$2,now()+interval '8 hours')",
        [hash(value), user.id],
      );
      await db.query("COMMIT");
      const res = json({ user: { id: user.id } });
      res.cookies.set(cookie, value, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.COOKIE_SECURE === "true",
        path: "/",
        maxAge: 28800,
      });
      return res;
    }
    if (route === "photos" && path.length === 2 && req.method === "GET") {
      const row = (
        await db.query(
          "select mime,data from public.photo_files where id=$1 and exists(select 1 from public.vehicle_photos where url=$2)",
          [path[1], `/api/photos/${path[1]}`],
        )
      ).rows[0];
      await db.query("COMMIT");
      return row
        ? new NextResponse(new Uint8Array(row.data), {
            headers: {
              "Content-Type": row.mime,
              "X-Content-Type-Options": "nosniff",
              "Cache-Control": "no-store",
            },
          })
        : json({ error: "Foto no encontrada." }, 404);
    }
    if (
      route === "data" &&
      req.method === "GET" &&
      !req.nextUrl.searchParams.has("admin")
    ) {
      await db.query("SET LOCAL ROLE anon");
      const result = await db.query(
        "select public.public_transport_data() as data",
      );
      await db.query("COMMIT");
      return json(result.rows[0].data);
    }
    if (!session)
      return json({ error: "Acceso administrativo requerido." }, 401);
    if (route === "photos" || route === "vehicles")
      await db.query("select pg_advisory_xact_lock(726432)");
    if (route === "photos") {
      if (req.method === "POST") {
        const mime = req.headers.get("content-type") ?? "";
        if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
          return json({ error: "Formato inv�lido." }, 400);
        const chunks: Uint8Array[] = [];
        let length = 0;
        const reader = req.body?.getReader();
        if (!reader) return json({ error: "Archivo vac�o." }, 400);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > 5242880) {
            await reader.cancel();
            return json({ error: "M�ximo 5 MB." }, 413);
          }
          chunks.push(value);
        }
        if (!length) return json({ error: "Archivo vac�o." }, 400);
        const result = await db.query(
          "insert into public.photo_files(mime,data) values($1,$2) returning id",
          [mime, Buffer.concat(chunks)],
        );
        await db.query("COMMIT");
        return json({ url: `/api/photos/${result.rows[0].id}` });
      }
      if (req.method === "DELETE") {
        const { urls } = await req.json();
        if (!Array.isArray(urls) || urls.some((x) => typeof x !== "string"))
          return json({ error: "Fotos inv�lidas." }, 400);
        await db.query(
          "delete from public.photo_files where '/api/photos/'||id=any($1::text[]) and not exists(select 1 from public.vehicle_photos where url='/api/photos/'||photo_files.id)",
          [urls],
        );
        await db.query("COMMIT");
        return json({ ok: true });
      }
    }
    await db.query("select set_config('app.actor',$1,true)", [session.id]);
    await db.query("SET LOCAL ROLE authenticated");
    if (route === "data" && req.method === "GET") {
      const vehicles = (await db.query("select * from public.vehicles")).rows;
      const occupations = (await db.query("select * from public.occupations"))
        .rows;
      const settings = (
        await db.query(
          "select name,color,logo,version from public.settings where id=1",
        )
      ).rows[0];
      await db.query("COMMIT");
      return json({ vehicles, occupations, settings });
    }
    if (route === "audit" && req.method === "GET") {
      const clauses: string[] = [];
      const values: unknown[] = [];
      for (const [param, col, operator] of [
        ["entity", "entity", "="],
        ["operation", "operation", "="],
        ["actor", "actor", "="],
        ["from", "created_at", ">="],
        ["to", "created_at", "<"],
      ]) {
        const value = req.nextUrl.searchParams.get(param);
        if (value) {
          values.push(value);
          clauses.push(`${col} ${operator} $${values.length}`);
        }
      }
      const where = clauses.length ? " where " + clauses.join(" and ") : "";
      const count = Number(
        (
          await db.query(
            "select count(*) from public.audit_log" + where,
            values,
          )
        ).rows[0].count,
      );
      const page = Number(req.nextUrl.searchParams.get("page") ?? 0);
      if (!Number.isSafeInteger(page) || page < 0)
        return json({ error: "P�gina inv�lida." }, 400);
      values.push(page * 20);
      const rows = (
        await db.query(
          "select * from public.audit_log" +
            where +
            ` order by created_at desc,id desc limit 20 offset $${values.length}`,
          values,
        )
      ).rows;
      await db.query("COMMIT");
      return json({ rows, count });
    }
    if (fields[route] && req.method === "POST") {
      const body = await req.json();
      const columns = fields[route].filter((x) => Object.hasOwn(body, x));
      if (!columns.length || (route !== "settings" && !body.id))
        return json({ error: "Registro inv�lido." }, 400);
      const insertValues = columns.map((x) =>
        x === "photos" ? JSON.stringify(body[x]) : body[x],
      );
      const updates = columns.filter((x) => x !== "id" && x !== "version");
      const values = updates.map((x) =>
        x === "photos" ? JSON.stringify(body[x]) : body[x],
      );
      const assignments = updates.map((x, i) => `${x}=$${i + 1}`);
      values.push(body.version ?? 1);
      assignments.push(`version=$${values.length}`);
      values.push(route === "settings" ? 1 : body.id);
      const result = await db.query(
        `update public.${route} set ${assignments.join(",")} where id=$${values.length} returning id`,
        values,
      );
      if (!result.rowCount) {
        if (route === "settings" || body.version)
          return json({ error: "El registro ya no existe." }, 409);
        await db.query(
          `insert into public.${route} (${columns.join(",")}) values (${columns.map((_, i) => `$${i + 1}`).join(",")})`,
          insertValues,
        );
      }
      await db.query("COMMIT");
      return json({ ok: true });
    }
    return json({ error: "Ruta o m�todo inv�lido." }, 404);
  } catch (error) {
    const e = error as Error & { code?: string };
    const status =
      e.code === "PT409" || e.code === "23P01" || e.code === "23505"
        ? 409
        : e.code?.startsWith("22") ||
            e.code?.startsWith("23") ||
            e.code === "P0001"
          ? 400
          : 500;
    return json(
      {
        error:
          e.code === "23P01"
            ? "El veh�culo ya est� ocupado en ese horario."
            : status === 500
              ? "No se pudo completar la solicitud."
              : e.message,
      },
      status,
    );
  } finally {
    await db.query("ROLLBACK");
    db.release();
  }
}
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
