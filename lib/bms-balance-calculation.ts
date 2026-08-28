export function summarizeBmsBalanceAmounts(input: {
    initialBalance: number;
    completed: Array<{ amount: number; isHanging: boolean }>;
    estimatedInProgress: number;
}) {
    let hangingDeduction = 0;
    let currentPeriodRealized = 0;

    for (const report of input.completed) {
        if (report.isHanging) {
            hangingDeduction += report.amount;
        } else {
            currentPeriodRealized += report.amount;
        }
    }

    const totalRealized = hangingDeduction + currentPeriodRealized;

    return {
        hangingDeduction,
        currentPeriodRealized,
        totalRealized,
        totalEstimated: input.estimatedInProgress,
        availableBalance:
            input.initialBalance - totalRealized - input.estimatedInProgress,
    };
}
