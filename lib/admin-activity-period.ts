export type ActivityPeriodWindow = {
    start: Date;
    end?: Date;
};

export function getActivityPeriodWindow(
    period?: string,
    now = new Date(),
): ActivityPeriodWindow {
    if (period && /^\d{2}-\d{4}$/.test(period)) {
        const [monthRaw, yearRaw] = period.split("-");
        const month = Number(monthRaw);
        const year = Number(yearRaw);

        if (month >= 1 && month <= 12 && year >= 1900) {
            return {
                start: new Date(year, month - 1, 1),
                end: new Date(year, month, 1),
            };
        }
    }

    return {
        start: new Date(now.getFullYear(), 0, 1),
    };
}
