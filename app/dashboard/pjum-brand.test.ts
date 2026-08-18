import test from "node:test";
import assert from "node:assert";
import { buildPjumBrandWhere } from "@/lib/store-brand-filter";

const baseWhere = {
  NOT: { branchName: "ADMIN_HO" },
};

test("scopes a brand PJUM query to its report numbers", () => {
  assert.deepStrictEqual(
    buildPjumBrandWhere(baseWhere, "LAWSON", ["L-1", "L-2"]),
    {
      ...baseWhere,
      reportNumbers: { hasSome: ["L-1", "L-2"] },
    },
  );
});

test("leaves the all-brand PJUM query unchanged", () => {
  assert.strictEqual(buildPjumBrandWhere(baseWhere, "ALL", ["L-1"]), baseWhere);
});
