/**
 * Applies pending Prisma migrations to a libsql/Turso database.
 *
 * Why this exists: Prisma 7's migration engine doesn't speak `libsql://` URLs,
 * so `prisma migrate deploy` can't run against Turso directly. This script
 * reads the same `prisma/migrations/*` files Prisma generates locally and
 * applies them through the libsql client, tracking applied migrations in a
 * `_prisma_migrations` table compatible with Prisma's own format.
 *
 * Workflow:
 *   - Locally: run `npx prisma migrate dev --name <change>` against `file:./dev.db`
 *   - Commit the new migration directory
 *   - On Vercel: this script runs as part of `npm run build` and applies
 *     any unseen migrations to Turso before Next.js builds.
 *
 * For local dev (sqlite file) this script is a no-op — it only runs when
 * DATABASE_URL points to a libsql:// URL.
 */

import "dotenv/config";
import { createClient } from "@libsql/client";
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

if (!DATABASE_URL.startsWith("libsql://") && !DATABASE_URL.startsWith("https://")) {
  console.log(`[migrate-turso] DATABASE_URL is not libsql/https (${DATABASE_URL}); skipping.`);
  process.exit(0);
}

const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN });

async function ensureMigrationsTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await client.execute(`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`);
  return new Set(result.rows.map((r) => String(r.migration_name)));
}

function listMigrationDirs(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => {
      const full = join(MIGRATIONS_DIR, name);
      return statSync(full).isDirectory();
    })
    .sort();
}

async function applyMigration(name: string) {
  const sqlPath = join(MIGRATIONS_DIR, name, "migration.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  const id = randomUUID();
  const startedAt = new Date().toISOString();

  console.log(`[migrate-turso] Applying ${name}...`);

  await client.executeMultiple(sql);

  const finishedAt = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, checksum, name, startedAt, finishedAt, 1],
  });

  console.log(`[migrate-turso] ✓ ${name}`);
}

async function main() {
  console.log(`[migrate-turso] Connecting to ${DATABASE_URL}`);
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const all = listMigrationDirs();
  const pending = all.filter((m) => !applied.has(m));

  if (pending.length === 0) {
    console.log(`[migrate-turso] No pending migrations (${all.length} already applied).`);
    return;
  }

  console.log(`[migrate-turso] Found ${pending.length} pending migration(s).`);
  for (const name of pending) {
    await applyMigration(name);
  }

  console.log(`[migrate-turso] Done. Applied ${pending.length} migration(s).`);
}

main()
  .catch((err) => {
    console.error("[migrate-turso] FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    client.close();
  });
