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

console.log("BMS balance server guard assertions passed");
