import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
test("migration, overlap constraints, audit, and public permissions", async () => {
  const db = new PGlite({ extensions: { btree_gist } });
  try {
    await db.exec(
      `create role anon;create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth, public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,bucket_id text);alter table storage.objects enable row level security;`,
    );
    await db.exec(
      await readFile("supabase/migrations/202610010001_initial.sql", "utf8"),
    );
    await db.exec(
      await readFile("supabase/migrations/202610010002_photos.sql", "utf8"),
    );
    await db.exec(await readFile("supabase/seed-demo.sql", "utf8"));
    const vehicle = "22222222-2222-4222-8222-222222222222";
    await db.query("update public.vehicles set photos=$1 where id=$2", [
      JSON.stringify(["https://example.test/photo.jpg"]),
      vehicle,
    ]);
    const photos = await db.query<{ position: number; url: string }>(
      "select position,url from public.vehicle_photos where vehicle_id=$1",
      [vehicle],
    );
    assert.equal(photos.rows[0].position, 0);
    assert.equal(photos.rows[0].url, "https://example.test/photo.jpg");
    const insert = (start: string, end: string, kind = "reservation") =>
      db.query(
        `insert into public.occupations(vehicle_id,kind,starts_at,ends_at,contact,notes) values($1,$2,$3,$4,'PRIVATE-CONTACT','PRIVATE-NOTE') returning id`,
        [vehicle, kind, start, end],
      );
    const first = await insert("2027-01-01T12:00Z", "2027-01-01T15:00Z");
    await assert.rejects(
      insert("2027-01-01T13:00Z", "2027-01-01T16:00Z", "maintenance"),
      /conflicting key/,
    );
    await insert("2027-01-01T15:00Z", "2027-01-01T16:00Z");
    await db.query("update public.occupations set cancelled=true where id=$1", [
      (first.rows[0] as { id: string }).id,
    ]);
    await insert("2027-01-01T12:00Z", "2027-01-01T15:00Z");
    const concurrent = await Promise.allSettled([
      insert("2027-01-02T12:00Z", "2027-01-02T15:00Z"),
      insert("2027-01-02T13:00Z", "2027-01-02T16:00Z"),
    ]);
    assert.equal(concurrent.filter((x) => x.status === "fulfilled").length, 1);
    await assert.rejects(
      db.exec(
        `insert into public.vehicles(name,plate,type,year,capacity) values('Duplicate','pbgh62','bus',2020,20)`,
      ),
      /unique constraint/,
    );
    await db.query("update public.vehicles set archived=true where id=$1", [
      vehicle,
    ]);
    await assert.rejects(
      insert("2027-01-03T12:00Z", "2027-01-03T15:00Z"),
      /archivado/,
    );
    await db.query("update public.vehicles set archived=false where id=$1", [
      vehicle,
    ]);
    const audit = await db.query<{ count: string }>(
      "select count(*) from public.audit_log",
    );
    assert.ok(Number(audit.rows[0].count) > 5);
    await db.exec("set role anon");
    const pub = await db.query("select public.public_transport_data() as data");
    const serialized = JSON.stringify(pub.rows);
    assert.ok(!serialized.includes("PRIVATE"));
    assert.ok(!serialized.includes("organization"));
    assert.ok(!serialized.includes('cancelled":true'));
    await assert.rejects(
      db.exec("select * from public.occupations"),
      /permission denied/,
    );
    await assert.rejects(
      db.exec("update public.vehicles set name='Hacked'"),
      /permission denied/,
    );
    await db.exec("reset role");
    const admin = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const outsider = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    await db.exec(
      `insert into auth.users values('${admin}'),('${outsider}');insert into public.admin_profiles values('${admin}');set role authenticated;select set_config('request.jwt.claim.sub','${outsider}',false);`,
    );
    const blocked = await db.query("select * from public.occupations");
    assert.equal(blocked.rows.length, 0);
    await assert.rejects(
      insert("2027-02-01T12:00Z", "2027-02-01T15:00Z"),
      /row-level security/,
    );
    await db.exec(
      `select set_config('request.jwt.claim.sub','${admin}',false)`,
    );
    const allowed = await db.query("select * from public.occupations");
    assert.ok(allowed.rows.length > 0);
    await insert("2027-02-01T12:00Z", "2027-02-01T15:00Z");
  } finally {
    await db.close();
  }
});
