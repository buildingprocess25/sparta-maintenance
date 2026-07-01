import { getJakartaMonthWindow, getJakartaYearWindow } from "./time";

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
            const { start, endExclusive } = getJakartaMonthWindow(year, month);
            return { start, end: endExclusive };
        }
    }

    const { start } = getJakartaYearWindow(now.getFullYear());
    return { start };
}
