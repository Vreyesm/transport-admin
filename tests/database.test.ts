import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
test("migration, overlap constraints, audit, and public permissions", async () => {
  const db = new PGlite({ extensions: { btree_gist } });
  try {
    await db.exec(
      await readFile("database/migrations/001_initial.sql", "utf8"),
    );
    await db.exec(await readFile("database/seed.sql", "utf8"));
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
    await assert.rejects(
      db.query("update public.vehicles set archived=true where id=$1", [
        vehicle,
      ]),
      /asignaciones pendientes/,
    );
    await db.query(
      "update public.occupations set cancelled=true where vehicle_id=$1",
      [vehicle],
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
    assert.ok(!serialized.includes("audit_log"));
    await assert.rejects(
      db.exec("select * from public.audit_log"),
      /permission denied/,
    );
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
      `insert into auth.users(id,email,password_hash) values('${admin}','admin@test','unused'),('${outsider}','outsider@test','unused');insert into public.admin_profiles values('${admin}');set role authenticated;select set_config('app.actor','${outsider}',false);`,
    );
    const blocked = await db.query("select * from public.occupations");
    assert.equal(blocked.rows.length, 0);
    assert.equal(
      (await db.query("select * from public.audit_log")).rows.length,
      0,
    );
    await assert.rejects(
      insert("2027-02-01T12:00Z", "2027-02-01T15:00Z"),
      /row-level security/,
    );
    await db.exec(`select set_config('app.actor','${admin}',false)`);
    const allowed = await db.query("select * from public.occupations");
    assert.ok(allowed.rows.length > 0);
    await insert("2027-02-01T12:00Z", "2027-02-01T15:00Z");
    const attributed = await db.query<{
      actor: string;
      before_data: unknown;
      after_data: { contact: string };
    }>(
      "select actor,before_data,after_data from public.audit_log where actor=$1 and operation='INSERT' order by id desc limit 1",
      [admin],
    );
    assert.equal(attributed.rows[0].actor, admin);
    assert.equal(attributed.rows[0].before_data, null);
    assert.equal(attributed.rows[0].after_data.contact, "PRIVATE-CONTACT");
    await assert.rejects(
      db.exec(
        "insert into public.audit_log(entity,record_id,operation) values('vehicles','fake','INSERT')",
      ),
      /permission denied/,
    );
    const snapshot = await db.query<{ id: string; version: number }>(
      "select id,version from public.occupations where vehicle_id=$1 and not cancelled limit 1",
      [vehicle],
    );
    const old = snapshot.rows[0];
    await db.query(
      "update public.occupations set cancelled=true,version=$1 where id=$2",
      [old.version, old.id],
    );
    await assert.rejects(
      db.query(
        "update public.occupations set cancelled=false,version=$1 where id=$2",
        [old.version, old.id],
      ),
      /Otro administrador/,
    );
    const after = await db.query<{ cancelled: boolean; version: number }>(
      "select cancelled,version from public.occupations where id=$1",
      [old.id],
    );
    assert.equal(after.rows[0].cancelled, true);
    assert.equal(after.rows[0].version, old.version + 1);
    await db.exec("reset role");
    await db.query("update public.vehicles set photos=$1 where id=$2", [
      JSON.stringify([
        "https://project.test/storage/v1/object/public/vehicle-photos/used.jpg",
      ]),
      vehicle,
    ]);
    await assert.rejects(
      db.exec("set role anon; select * from auth.users"),
      /permission denied/,
    );
    await db.exec("reset role");
  } finally {
    await db.close();
  }
});
