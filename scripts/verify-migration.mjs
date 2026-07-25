import pg from "pg";

const password = process.env.MIGRATION_DB_PASSWORD;
const connectionString = `postgresql://postgres.jigofltiiripncqkpeie:${encodeURIComponent(password)}@aws-0-eu-west-3.pooler.supabase.com:5432/postgres`;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

await client.connect();

const rls = await client.query(
  `select relname, relrowsecurity from pg_class where relname in ('players','matches','match_players','activity','match_invites')`,
);
console.log("RLS enabled:", rls.rows);

const policies = await client.query(
  `select tablename, policyname, cmd from pg_policies where schemaname='public' order by tablename, policyname`,
);
console.log("policies:", policies.rows.length);
policies.rows.forEach((r) => console.log(" -", r.tablename, r.policyname, r.cmd));

const pub = await client.query(
  `select tablename from pg_publication_tables where pubname = 'supabase_realtime'`,
);
console.log("realtime tables:", pub.rows.map((r) => r.tablename));

await client.end();
