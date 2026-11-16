import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { Client } from 'pg';

// Compare actual legacy financial/clinical rows across a forward-only migration.
// The baseline application must create purchases/results before snapshot mode.
const target = new URL(process.env.DATABASE_URL ?? '');
assert.ok(['localhost', '127.0.0.1'].includes(target.hostname));
assert.equal(target.port, '55429');
assert.match(target.pathname, /^\/patient_entry_verify_[a-f0-9]{32}$/);
const [mode, artifact] = process.argv.slice(2);
assert.ok(['snapshot', 'verify'].includes(mode) && artifact);
const db = new Client({ connectionString: target.toString() });
const quote = value => '"' + value.replaceAll('"', '""') + '"';
await db.connect();
try {
  const capture = async definitions => {
    const rows = {};
    for (const [table, columns] of Object.entries(definitions)) {
      const sql = `SELECT count(*)::int AS count, encode(sha256(convert_to(COALESCE(string_agg(row_to_json(old)::text,E'\\n' ORDER BY row_to_json(old)::text),''),'UTF8')),'hex') AS hash FROM (SELECT ${columns.map(quote).join(',')} FROM ${quote(table)}) old`;
      rows[table] = (await db.query(sql)).rows[0];
    }
    const access = (await db.query('SELECT id, assessment_grant_readable(g.id,g.patient_id) AS readable, assessment_grant_processable(g.id) AS processable FROM assessment_access_grants g ORDER BY id')).rows;
    return { rows, access };
  };
  if (mode === 'snapshot') {
    const definitions = {};
    for (const row of (await db.query("SELECT c.table_name, c.column_name FROM information_schema.columns c JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name WHERE c.table_schema='public' AND t.table_type='BASE TABLE' AND c.table_name<>'_prisma_migrations' ORDER BY c.table_name,c.ordinal_position")).rows) (definitions[row.table_name] ??= []).push(row.column_name);
    const data = await capture(definitions);
    for (const name of ['assessment_purchases','assessment_access_grants','patient_assessment_submissions','mezaj_results','wallet_journals']) assert.ok(data.rows[name]?.count > 0, `Actual legacy fixture required: ${name}`);
    await writeFile(artifact, JSON.stringify({ definitions, ...data }, null, 2));
    console.log(`PASS pre-upgrade: ${Object.keys(definitions).length} historical tables snapshotted; real purchases, entitlements, results and wallet proofs`);
  } else {
    const before = JSON.parse(await readFile(artifact, 'utf8'));
    const after = await capture(before.definitions);
    assert.deepEqual(after.rows, before.rows, 'Existing row counts and original column hashes must remain identical');
    assert.deepEqual(after.access, before.access, 'Legacy access decisions must remain identical');
    assert.equal((await db.query('SELECT count(*)::int AS count FROM assessment_admin_publications')).rows[0].count, 0);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM consent_policy_versions WHERE assessment_offering_version_id IS NOT NULL')).rows[0].count, 0);
    console.log(`PASS upgrade: all ${Object.keys(before.definitions).length} original tables byte-identical; legacy grant decisions preserved; no fabricated ADMIN publication or consent backfill`);
  }
} finally { await db.end(); }
