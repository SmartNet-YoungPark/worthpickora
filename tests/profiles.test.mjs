import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const alice = "00000000-0000-0000-0000-000000000001";
const bob = "00000000-0000-0000-0000-000000000002";

test("Supabase profiles migration and access controls", async t => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated, service_role;
      grant execute on function auth.uid() to authenticated, service_role;
      insert into auth.users values ('${alice}', '{"first_name":"Alice","role":"Admin"}');
    `);
    await db.exec(await readFile(new URL("../supabase/migrations/20260917000100_create_profiles.sql", import.meta.url), "utf8"));

    await t.test("existing users are backfilled with no assigned role", async () => {
      const { rows } = await db.query("select * from public.profiles");
      assert.equal(rows.length, 1);
      assert.equal(rows[0].first_name, "Alice");
      assert.equal(rows[0].role, null);
    });
    await t.test("signup creates a profile and ignores role metadata", async () => {
      await db.query("insert into auth.users values ($1, $2)", [bob, { first_name: "Bob", role: "Admin" }]);
      const { rows } = await db.query("select role from public.profiles where id=$1", [bob]);
      assert.equal(rows[0].role, null);
    });
    await t.test("authenticated users only read and edit their own permitted fields", async () => {
      await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${alice}', false);`);
      assert.deepEqual((await db.query("select id from public.profiles")).rows, [{ id: alice }]);
      await db.query("update public.profiles set first_name='Updated Alice' where id=$1", [alice]);
      assert.equal((await db.query("select first_name from public.profiles")).rows[0].first_name, "Updated Alice");
      const other = await db.query("update public.profiles set first_name='Unauthorized' where id=$1 returning id", [bob]);
      assert.equal(other.rows.length, 0);
      await assert.rejects(db.query("update public.profiles set role='Admin' where id=$1", [alice]), { code: "42501" });
      await assert.rejects(db.query("update public.profiles set id=$1 where id=$2", [bob, alice]), { code: "42501" });
      await assert.rejects(db.query("delete from public.profiles where id=$1", [alice]), { code: "42501" });
      await assert.rejects(db.query("insert into public.profiles (id,role) values ($1,'Admin')", [alice]), { code: "42501" });
      await db.exec("reset role");
    });
    await t.test("anonymous users cannot read profiles", async () => {
      await db.exec("set role anon");
      await assert.rejects(db.query("select * from public.profiles"), { code: "42501" });
      await db.exec("reset role");
    });
    await t.test("trusted server can choose Admin, User, or SQL NULL, but no arbitrary roles", async () => {
      await db.exec("set role service_role");
      for (const role of ["Admin", "User", null]) {
        await db.query("update public.profiles set role=$1 where id=$2", [role, alice]);
        assert.equal((await db.query("select role from public.profiles where id=$1", [alice])).rows[0].role, role);
      }
      for (const role of ["Null", "Owner", "admin"]) {
        await assert.rejects(db.query("update public.profiles set role=$1 where id=$2", [role, alice]), { code: "22P02" });
      }
      await db.exec("reset role");
    });
    await t.test("foreign keys and auth-user deletion keep profiles consistent", async () => {
      await assert.rejects(db.query("insert into public.profiles (id) values ('00000000-0000-0000-0000-000000000099')"), { code: "23503" });
      await db.query("delete from auth.users where id=$1", [bob]);
      assert.equal((await db.query("select id from public.profiles where id=$1", [bob])).rows.length, 0);
      assert.equal((await db.query("select id from public.profiles where id=$1", [alice])).rows.length, 1);
    });
  } finally { await db.close(); }
});
