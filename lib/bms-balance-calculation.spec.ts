import assert from "node:assert/strict";
import { summarizeBmsBalanceAmounts } from "./bms-balance-calculation";

assert.deepEqual(
    summarizeBmsBalanceAmounts({
        initialBalance: 1_000_000,
        completed: [
            { amount: 300_000, isHanging: true },
            { amount: 100_000, isHanging: false },
        ],
        estimatedInProgress: 50_000,
    }),
    {
        hangingDeduction: 300_000,
        currentPeriodRealized: 100_000,
        totalRealized: 400_000,
        totalEstimated: 50_000,
        availableBalance: 550_000,
    },
);

assert.equal(
    summarizeBmsBalanceAmounts({
        initialBalance: 1_000_000,
        completed: [{ amount: 1_200_000, isHanging: true }],
        estimatedInProgress: 0,
    }).availableBalance,
    -200_000,
);

console.log("BMS balance breakdown assertions passed");
