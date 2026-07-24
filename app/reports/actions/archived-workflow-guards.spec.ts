import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const guardedActions = [
    ["approve-estimation.ts", "ReportStatus.PENDING_ESTIMATION"],
    ["approve-final.ts", "ReportStatus.APPROVED_BMC"],
    ["start-work.ts", "ReportStatus.ESTIMATION_APPROVED"],
    ["start-work-with-photos.ts", "ReportStatus.ESTIMATION_APPROVED"],
    ["review-completion.ts", "ReportStatus.PENDING_REVIEW"],
    ["resubmit.ts", "currentStatus"],
    ["submit-completion.ts", "report.status"],
    ["submit-completion-work.ts", "report.status"],
] as const;

for (const [fileName, expectedStatus] of guardedActions) {
    const source = readFileSync(new URL(fileName, import.meta.url), "utf8");
    assert.match(
        source,
        new RegExp(
            String.raw`report\.update\(\{\s*where:\s*\{\s*reportNumber,\s*status:\s*${expectedStatus.replaceAll(".", String.raw`\.`)}\s*,?\s*\}`,
        ),
        `${fileName} must guard its Report update with ${expectedStatus}`,
    );
}

const revisionSource = readFileSync(
    new URL(
        "../../dashboard/intervensi/revisi-laporan/actions.ts",
        import.meta.url,
    ),
    "utf8",
);
const completedGuards =
    revisionSource.match(
        /report\.update\(\{\s*where:\s*\{\s*reportNumber(?::\s*input\.reportNumber)?,\s*status:\s*"COMPLETED"\s*,?\s*\}/g,
    ) ?? [];

assert.equal(
    completedGuards.length,
    2,
    "both revision Report updates must require COMPLETED status",
);

console.log("archived workflow guard assertions passed");
