export const UTC_TIME_ZONE = "UTC";
export const JAKARTA_TIME_ZONE = "Asia/Jakarta";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
});

const JAKARTA_PARTS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
});

const EXCEL_DATE_OFFSET = 25569;
const MS_PER_DAY = 86_400_000;

export function formatJakartaDateTime(value: Date | string | null | undefined) {
    if (!value) return "";
    return DATE_TIME_FORMATTER.format(new Date(value));
}

export function formatJakartaDate(value: Date | string | null | undefined) {
    if (!value) return "";
    return DATE_FORMATTER.format(new Date(value));
}

export function getJakartaDayRange(dateKey: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
    if (!match) throw new Error(`Invalid date key: ${dateKey}`);

    const [, year, month, day] = match;
    const start = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)) - 7 * 60 * 60 * 1000);
    const endExclusive = new Date(start.getTime() + MS_PER_DAY);

    return { start, endExclusive };
}

export function getJakartaDateRange(fromDate?: string, toDate?: string) {
    return {
        start: fromDate ? getJakartaDayRange(fromDate).start : undefined,
        endExclusive: toDate ? getJakartaDayRange(toDate).endExclusive : undefined,
    };
}

export function getJakartaYearWindow(year: number) {
    return {
        start: getJakartaDayRange(`${year}-01-01`).start,
        endExclusive: getJakartaDayRange(`${year + 1}-01-01`).start,
    };
}

export function getJakartaQuarterWindow(year: number, quarter: 1 | 2 | 3 | 4) {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 3;
    const endYear = endMonth > 12 ? year + 1 : year;
    const normalizedEndMonth = endMonth > 12 ? endMonth - 12 : endMonth;

    return {
        start: getJakartaDayRange(`${year}-${String(startMonth).padStart(2, "0")}-01`).start,
        endExclusive: getJakartaDayRange(`${endYear}-${String(normalizedEndMonth).padStart(2, "0")}-01`).start,
    };
}

export function getJakartaQuarterKey(value: Date | string) {
    const month = Number(getJakartaParts(new Date(value)).month);
    if (month <= 3) return "q1";
    if (month <= 6) return "q2";
    if (month <= 9) return "q3";
    return "q4";
}

export function toExcelJakartaSerial(value: Date | string | null | undefined) {
    if (!value) return null;

    const parts = getJakartaParts(new Date(value));
    const wallClockUtcMs = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second),
    );

    return EXCEL_DATE_OFFSET + wallClockUtcMs / MS_PER_DAY;
}

export function getTodayJakartaDateKey(now = new Date()) {
    const parts = getJakartaParts(now);
    return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getTodayJakartaRange(now = new Date()) {
    return getJakartaDayRange(getTodayJakartaDateKey(now));
}

function getJakartaParts(date: Date) {
    return Object.fromEntries(
        JAKARTA_PARTS_FORMATTER.formatToParts(date)
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value]),
    ) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", string>;
}
