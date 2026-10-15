import {
    JAKARTA_TIME_ZONE,
    getJakartaDayKey,
    getJakartaDayRange,
} from "@/lib/time";

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

export const BNM_REVIEW_WARNING_HOURS = 24;
export const BNM_REVIEW_DEFAULT_SLA_DAYS = 1;

export type BnmReviewState = "ON_TIME" | "WARNING" | "OVERDUE";

const DEADLINE_DAY_FORMATTER = new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
});

/**
 * Batas review BNM (eksklusif): 00:00 WIB di awal hari ke-(slaDays + 1)
 * setelah hari laporan masuk Review BNM. Contoh slaDays=1: masuk Rabu 10:00
 * → batas Kamis 23:59:59 (nilai kembalian = Jumat 00:00 WIB).
 * Asia/Jakarta tidak memakai DST, jadi penambahan 24 jam aman.
 */
export function getBnmReviewDeadline(enteredAt: Date, slaDays: number): Date {
    const dayStart = getJakartaDayRange(getJakartaDayKey(enteredAt)).start;
    return new Date(dayStart.getTime() + (slaDays + 1) * MS_PER_DAY);
}

export function getBnmReviewState({
    enteredAt,
    slaDays,
    now = new Date(),
}: {
    enteredAt: Date;
    slaDays: number;
    now?: Date;
}): BnmReviewState {
    if (now.getTime() >= getBnmReviewDeadline(enteredAt, slaDays).getTime()) {
        return "OVERDUE";
    }
    if (
        now.getTime() - enteredAt.getTime() >
        BNM_REVIEW_WARNING_HOURS * MS_PER_HOUR
    ) {
        return "WARNING";
    }
    return "ON_TIME";
}

/** Label manusiawi untuk batas terakhir, mis. "Kamis, 15 Okt 2026, 23:59 WIB". */
export function formatBnmReviewDeadline(deadlineAt: Date): string {
    const lastMoment = new Date(deadlineAt.getTime() - 60_000);
    return `${DEADLINE_DAY_FORMATTER.format(lastMoment)}, 23:59 WIB`;
}

/** Laporan yang sudah lewat tenggat dengan tenggat paling awal, atau null. */
export function findOverdueBnmReport<T extends { enteredAt: Date }>(
    candidates: T[],
    slaDays: number,
    now: Date = new Date(),
): (T & { deadlineAt: Date }) | null {
    let result: (T & { deadlineAt: Date }) | null = null;

    for (const candidate of candidates) {
        const deadlineAt = getBnmReviewDeadline(candidate.enteredAt, slaDays);
        if (now.getTime() < deadlineAt.getTime()) continue;
        if (!result || deadlineAt.getTime() < result.deadlineAt.getTime()) {
            result = { ...candidate, deadlineAt };
        }
    }

    return result;
}
