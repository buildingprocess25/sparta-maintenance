import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const startWorkWithPhotosSource = readFileSync(
    "app/reports/actions/start-work-with-photos.ts",
    "utf8",
);

assert.match(
    startWorkWithPhotosSource,
    /import\s+\{\s*isBmsLockedByPjum\s*\}\s+from\s+"@\/lib\/balance";/,
    "startWorkWithPhotos must import isBmsLockedByPjum",
);
assert.match(
    startWorkWithPhotosSource,
    /const\s+isLocked\s*=\s*await\s+isBmsLockedByPjum\(user\.NIK\);/,
    "startWorkWithPhotos must check whether the BMS period is locked",
);
assert.match(
    startWorkWithPhotosSource,
    /if\s*\(\s*isLocked\s*\)\s*\{[\s\S]*return\s*\{[\s\S]*error:/,
    "startWorkWithPhotos must return an error while locked",
);
assert(
    startWorkWithPhotosSource.indexOf("isBmsLockedByPjum(user.NIK)") <
        startWorkWithPhotosSource.indexOf("ReportStatus.ESTIMATION_APPROVED"),
    "lock check must run before the status transition guard and update path",
);

const resubmitSource = readFileSync("app/reports/actions/resubmit.ts", "utf8");

assert.match(
    resubmitSource,
    /import\s+\{[^}]*calculateBmsBalance[^}]*createNewBmsPeriod[^}]*getBmsActivePeriod[^}]*hasBmsRepairItems[^}]*\}\s+from\s+"@\/lib\/balance";/,
    "resubmitReport must import BMS balance helpers",
);
assert.match(
    resubmitSource,
    /const\s+hasBalanceImpact\s*=\s*hasBmsRepairItems\(itemsJson\);/,
    "resubmitReport must detect BMS repair items after rebuilding item JSON",
);
assert.match(
    resubmitSource,
    /const\s+availableForThisReport\s*=\s*balance\.availableBalance\s*\+\s*previousEstimation;/,
    "resubmitReport must add the previous reserve back before validating revised estimation",
);
assert.match(
    resubmitSource,
    /if\s*\(\s*revisedEstimation\s*>\s*availableForThisReport\s*\)/,
    "resubmitReport must validate revised estimation amount against report-adjusted available balance",
);
assert.match(
    resubmitSource,
    /balancePeriodId:\s*activePeriodId,/,
    "resubmitReport must persist balancePeriodId when needed",
);

console.log("BMS balance server guard assertions passed");
