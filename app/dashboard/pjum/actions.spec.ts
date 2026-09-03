import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");

assert.match(
    actions,
    /balancePeriod:\s*\{\s*bmsNIK,\s*status:\s*\{\s*in:\s*\[\s*"ACTIVE",\s*"LOCKED_PJUM"\s*\]\s*\}\s*,?\s*\}/,
    "Dashboard PJUM active hanging lookup must include ACTIVE and LOCKED_PJUM periods",
);

assert.match(
    actions,
    /if\s*\(\s*expiredSelectedReport\s*\)\s*\{\s*return\s*\{\s*error:\s*`Laporan \$\{expiredSelectedReport\.reportNumber\} sudah hangus dan tidak bisa masuk PJUM`/,
    "createDashboardPjum must clearly reject an expired selected report",
);

assert.match(
    actions,
    /reportNumber:\s*\{\s*in:\s*safeNumbers\s*\},\s*status:\s*"COMPLETED",\s*pjumExportedAt:\s*null,\s*pjumExpiredAt:\s*null,\s*branchName,/,
    "createDashboardPjum export marker update must exclude expired reports",
);

console.log("dashboard PJUM action assertions passed");
