import { test, expect } from "vitest";
import { formatDashboardCurrency } from "./utils";

test("formatDashboardCurrency formats correctly", () => {
    // Under 1T uses full format
    expect(formatDashboardCurrency(3000000)).toBe("Rp 3.000.000");
    expect(formatDashboardCurrency(500000000)).toBe("Rp 500.000.000");
    
    // 1T and above uses compact T format
    expect(formatDashboardCurrency(2541000000000)).toBe("Rp 2,541 T");
    expect(formatDashboardCurrency(-1500000000000)).toBe("-Rp 1,5 T");
});
