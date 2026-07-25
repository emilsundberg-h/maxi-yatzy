import { readFileSync } from "node:fs";
import pg from "pg";

const password = process.env.MIGRATION_DB_PASSWORD;
if (!password) {
  console.error("MIGRATION_DB_PASSWORD env var not set");
  process.exit(1);
}

const connectionString = `postgresql://postgres.jigofltiiripncqkpeie:${encodeURIComponent(password)}@aws-0-eu-west-3.pooler.supabase.com:5432/postgres`;

const migrationFile = process.argv[2] || "0001_init.sql";
const sql = readFileSync(
  new URL(`../supabase/migrations/${migrationFile}`, import.meta.url),
  "utf-8",
);

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log("connected");
  await client.query(sql);
  console.log("migration applied successfully");

  const { rows } = await client.query(
    `select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
  );
  console.log(
    "public tables:",
    rows.map((r) => r.table_name),
  );
} catch (err) {
  console.error("MIGRATION FAILED:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
