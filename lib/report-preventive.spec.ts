import assert from "node:assert/strict";
import {
    PREVENTIVE_ITEM_IDS,
    hasCompletePreventiveEvidence,
    isRecordedPreventiveReport,
} from "./report-preventive";

const completeItems = PREVENTIVE_ITEM_IDS.map((itemId, index) => ({
    itemId,
    preventiveCondition:
        index % 3 === 0 ? "OK" : index % 3 === 1 ? "NOT_OK" : "TIDAK_ADA",
}));

assert.equal(hasCompletePreventiveEvidence(completeItems), true);
assert.equal(hasCompletePreventiveEvidence(completeItems.slice(1)), false);
assert.equal(
    hasCompletePreventiveEvidence([
        ...completeItems.slice(0, -1),
        {
            itemId: PREVENTIVE_ITEM_IDS.at(-1),
            preventiveCondition: null,
        },
        { itemId: "I999", preventiveCondition: "OK" },
    ]),
    false,
);
assert.equal(
    isRecordedPreventiveReport({ status: "DRAFT", items: completeItems }),
    false,
);
assert.equal(
    isRecordedPreventiveReport({
        status: "PENDING_ESTIMATION",
        items: completeItems,
    }),
    true,
);
assert.equal(
    isRecordedPreventiveReport({
        status: "ARCHIVED_PREVENTIVE",
        items: completeItems,
    }),
    true,
);

console.log("report preventive assertions passed");
