import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
    path.join(process.cwd(), "app/dashboard/queries.ts"),
    "utf8",
);

test("brand breakdown computes only the KPI fields consumed by the dashboard", () => {
    assert.match(source, /export type AdminCommandCenterDataBreakdown = \{\s*kpi: AdminKpiMetric;\s*\};/);
    assert.doesNotMatch(source, /alfamartStatus|lawsonStatus|alfamartBranches|lawsonBranches|alfamartTrends|lawsonTrends|alfamartStuckReports|lawsonStuckReports/);
    assert.match(source, /if \(brand === "ALL"\) \{\s*return new Set\(hierarchy\.options\.map/);
});
