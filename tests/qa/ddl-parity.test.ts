import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getTableColumns } from "drizzle-orm";
import { schema } from "../../src/db";

// House rule (AGENTS.md): every table a sync script self-heals with
// `CREATE TABLE IF NOT EXISTS` must match src/db/schema.ts exactly, or a later
// `drizzle-kit push --force` silently drops/recreates it (this once deleted a
// live table). Nothing enforced that the two hand-written definitions stay in
// sync — until this test. It runs each script's DDL into a throwaway in-memory
// DB and compares the real columns against what drizzle declares.

const SYNC_DIR = path.join(process.cwd(), "scripts", "sync");
const SYNC_FILES = [
  "committee-sessions.ts", "ministries.ts", "laws.ts",
  "votes.ts", "stats.ts", "budget.ts", "lobbyists.ts", "biography.ts",
];

// table name -> the drizzle schema object it must match.
const TABLES: Record<string, unknown> = {
  committee_sessions: schema.committeeSessions,
  committee_session_items: schema.committeeSessionItems,
  committee_session_docs: schema.committeeSessionDocs,
  gov_ministries: schema.govMinistries,
  mk_id_map: schema.mkIdMap,
  mk_agreement: schema.mkAgreement,
  mk_vote_stats: schema.mkVoteStats,
  budget_lines: schema.budgetLines,
  budget_totals: schema.budgetTotals,
  lobbyists: schema.lobbyists,
  lobbyist_clients: schema.lobbyistClients,
  person_bio: schema.personBio,
  israel_laws: schema.israelLaws,
};

// Pull every `CREATE TABLE IF NOT EXISTS <name> ( ... )` out of the sync source,
// matching parentheses so a trailing PRIMARY KEY (a, b) isn't truncated.
function extractCreateTables(src: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const name = m[1];
    let depth = 1;
    let i = re.lastIndex;
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")") depth--;
    }
    out.set(name, `CREATE TABLE ${name} (${src.slice(re.lastIndex, i - 1)})`);
  }
  return out;
}

const ddl = new Map<string, string>();
for (const f of SYNC_FILES) {
  const src = fs.readFileSync(path.join(SYNC_DIR, f), "utf8");
  for (const [name, stmt] of extractCreateTables(src)) ddl.set(name, stmt);
}

const norm = (t: string) => t.toLowerCase().trim();

for (const [name, tbl] of Object.entries(TABLES)) {
  test(`sync DDL for ${name} matches schema.ts`, () => {
    const stmt = ddl.get(name);
    assert.ok(stmt, `no CREATE TABLE IF NOT EXISTS found for ${name} in the sync scripts`);

    const db = new Database(":memory:");
    db.exec(stmt!);
    const info = db.prepare(`PRAGMA table_info(${name})`).all() as {
      name: string;
      type: string;
    }[];
    db.close();

    const cols = getTableColumns(tbl as Parameters<typeof getTableColumns>[0]);
    const declared: { name: string; getSQLType(): string }[] = Object.values(cols);

    const ddlNames = new Set(info.map((c) => c.name));
    const schemaNames = new Set(declared.map((c) => c.name));
    const missing = [...schemaNames].filter((n) => !ddlNames.has(n));
    const extra = [...ddlNames].filter((n) => !schemaNames.has(n));
    assert.deepEqual(missing, [], `${name}: columns in schema.ts but not the sync DDL`);
    assert.deepEqual(extra, [], `${name}: columns in the sync DDL but not schema.ts`);

    // Types must line up too (a drifted text-vs-integer would also trigger a recreate).
    const ddlType = new Map(info.map((c) => [c.name, norm(c.type)]));
    const typeMismatches = declared
      .filter((c) => ddlType.get(c.name) !== norm(c.getSQLType()))
      .map((c) => `${c.name}: schema=${norm(c.getSQLType())} ddl=${ddlType.get(c.name)}`);
    assert.deepEqual(typeMismatches, [], `${name}: column type drift`);
  });
}
