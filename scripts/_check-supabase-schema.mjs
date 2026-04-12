import pg from "pg";
const { Client } = pg;

const c = new Client({
    connectionString:
        "postgresql://postgres.awnxdtzmwfatyqutbids:spartaalfamart@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false },
});

await c.connect();

const tables = ["Report", "User", "Store", "PjumExport", "ApprovalLog", "ActivityLog"];
for (const table of tables) {
    const r = await c.query(
        `SELECT column_name, data_type, column_default, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table],
    );
    console.log(`\n=== ${table} (${r.rows.length} cols) ===`);
    for (const row of r.rows) {
        console.log(`  ${row.column_name} [${row.data_type}]`);
    }
}

// Sample one Report row to see actual data shape
const sample = await c.query(`SELECT * FROM "Report" LIMIT 1`);
if (sample.rows.length > 0) {
    const row = sample.rows[0];
    console.log("\n=== Report sample row keys ===");
    console.log(Object.keys(row).join(", "));
    console.log("\nValues:");
    for (const [k, v] of Object.entries(row)) {
        const display = v === null ? "NULL" : JSON.stringify(v).slice(0, 80);
        console.log(`  ${k}: ${display}`);
    }
}

await c.end();
