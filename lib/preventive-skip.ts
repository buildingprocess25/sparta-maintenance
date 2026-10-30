import { getJakartaMonth } from "@/lib/time";

export const PREVENTIVE_SKIPPED_ACTIVITY_NOTE =
    "Preventif dilewati (bulan pertama kuartal)";

export type PreventiveSkipInput = {
    /** I1–I10 sudah tercatat di kuartal berjalan. */
    coreCooling: boolean;
    now: Date;
};

/** Januari, April, Juli, Oktober (WIB). */
export function isFirstMonthOfJakartaQuarter(now: Date | string) {
    return (getJakartaMonth(now) - 1) % 3 === 0;
}

/**
 * Alasan BMS tidak boleh melewati preventif, atau null bila boleh.
 * Mode revisi ditangani pemanggil (client), bukan di sini.
 */
export function getPreventiveSkipBlocker(
    input: PreventiveSkipInput,
): string | null {
    if (input.coreCooling) {
        return "Toko sudah mengisi preventif di kuartal ini.";
    }
    if (!isFirstMonthOfJakartaQuarter(input.now)) {
        return "Lewati preventif hanya bisa di bulan pertama kuartal (Januari, April, Juli, Oktober).";
    }
    return null;
}

export function canSkipPreventive(input: PreventiveSkipInput) {
    return getPreventiveSkipBlocker(input) === null;
}
