import pg from "pg";
const { Client } = pg;
const c = new Client({
    connectionString: "postgresql://postgres.awnxdtzmwfatyqutbids:spartaalfamart@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false },
});
await c.connect();
const r = await c.query(`SELECT
  (SELECT COUNT(*) FROM "Report") as reports,
  (SELECT COUNT(*) FROM "User") as users,
  (SELECT COUNT(*) FROM "Store") as stores,
  (SELECT COUNT(*) FROM "ApprovalLog") as approvals,
  (SELECT COUNT(*) FROM "ActivityLog") as activities,
  (SELECT COUNT(*) FROM "PjumExport") as pjum,
  (SELECT COUNT(*) FROM "PjumBankAccount") as bank
`);
console.log(JSON.stringify(r.rows[0], null, 2));
await c.end();
