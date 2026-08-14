import assert from "node:assert/strict";
import { checklistCategories, type ChecklistItem } from "@/lib/checklist-data";
import { serializeChecklistItems } from "./draft-data";

const checklist = new Map<string, ChecklistItem>([
    [
        "A1",
        {
            id: "A1",
            name: "Bahu Jalan",
            condition: "rusak",
            handler: "BMS",
            notes: "Retak",
            ahoTicketNumber: "  AHO-123  ",
        },
    ],
    [
        "I1",
        {
            id: "I1",
            name: "Toilet",
            condition: "baik",
        },
    ],
]);

const result = serializeChecklistItems(checklist, checklistCategories);

assert.equal(result.find((item) => item.itemId === "A1")?.condition, "RUSAK");
assert.equal(
    result.find((item) => item.itemId === "A1")?.ahoTicketNumber,
    "AHO-123",
);
assert.equal(
    result.find((item) => item.itemId === "I1")?.preventiveCondition,
    "OK",
);
assert.equal(result.find((item) => item.itemId === "I1")?.condition, undefined);

checklist.set("A1", {
    ...checklist.get("A1")!,
    condition: "baik",
});
assert.equal(
    serializeChecklistItems(checklist, checklistCategories).find(
        (item) => item.itemId === "A1",
    )?.ahoTicketNumber,
    undefined,
);
assert.equal(
    serializeChecklistItems(checklist, checklistCategories).find(
        (item) => item.itemId === "A1",
    )?.handler,
    undefined,
);

console.log("draft-data tests passed");
