import test from "node:test";
import assert from "node:assert";
import { buildAdminTrendFilterHref } from "./admin-trend-filter";

test("omits brand when the control is disabled", () => {
  assert.strictEqual(
    buildAdminTrendFilterHref({
      basePath: "/dashboard/branches",
      period: "ytd",
      year: "2026",
      brand: "LAWSON",
      showBrandFilter: false,
    }),
    "/dashboard/branches?period=ytd",
  );
});

test("keeps selected brand on the admin dashboard", () => {
  assert.strictEqual(
    buildAdminTrendFilterHref({
      basePath: "/dashboard",
      period: "07",
      year: "2026",
      brand: "LAWSON",
      showBrandFilter: true,
    }),
    "/dashboard?period=07-2026&brand=LAWSON",
  );
});

test("swaps brand breakdown label colors (Alfamart is red, Lawson is blue)", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const source = fs.readFileSync(
    path.join(process.cwd(), "app/dashboard/_components/admin/admin-new-dashboard.tsx"),
    "utf-8"
  );
  assert.match(source, /text-red-600">Alfamart:/);
  assert.match(source, /text-blue-600">Lawson:/);
});
