import assert from "node:assert/strict";
import type { Prisma } from "@prisma/client";
import { BMS_DELETED_ASSIGNMENT_NOTE, vacateBmsAssignments } from "./bms-store-assignment";

async function main() {
    let captured: { where: unknown; data: Record<string, unknown> } | null = null;
    const fakeDb = {
        bmsStoreAssignment: {
            updateMany: async (args: { where: unknown; data: Record<string, unknown> }) => {
                captured = args;
                return { count: 3 };
            },
        },
    } as unknown as Prisma.TransactionClient;

    const before = Date.now();
    const result = await vacateBmsAssignments(fakeDb, "BMS001", "ADM001");

    assert.equal(BMS_DELETED_ASSIGNMENT_NOTE, "User BMS dihapus");
    assert.deepEqual(result, { count: 3 });
    assert.ok(captured);
    const args = captured as { where: unknown; data: Record<string, unknown> };
    assert.deepEqual(args.where, { bmsNIK: "BMS001", isActive: true });
    assert.equal(args.data.isActive, false);
    assert.equal(args.data.unassignedByNIK, "ADM001");
    assert.equal(args.data.notes, "User BMS dihapus");
    assert.ok(args.data.unassignedAt instanceof Date);
    assert.ok((args.data.unassignedAt as Date).getTime() >= before);

    console.log("bms-store-assignment assertions passed");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
