import { getSettingOverride, SETTING_KEYS } from "@/lib/app-settings";

type MaintenanceState = {
    enabled: boolean;
    message: string;
};

const DEFAULT_MAINTENANCE_MESSAGE = "Silakan coba lagi beberapa saat.";

function parseBooleanFlag(value: string | undefined): boolean {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return (
        normalized === "1" ||
        normalized === "true" ||
        normalized === "yes" ||
        normalized === "on"
    );
}

export function getMaintenanceState(): MaintenanceState {
    // 1. Env var = hard override (emergency / DevOps) - selalu prioritas utama
    if (parseBooleanFlag(process.env.MAINTENANCE_MODE)) {
        return { enabled: true, message: DEFAULT_MAINTENANCE_MESSAGE };
    }

    // 2. DB-backed toggle via globalThis bridge (untuk admin UI)
    const override = getSettingOverride(SETTING_KEYS.MAINTENANCE_ENABLED);
    if (override !== undefined) {
        return {
            enabled: parseBooleanFlag(override),
            message: DEFAULT_MAINTENANCE_MESSAGE,
        };
    }

    // 3. Fallback jika tidak ada env var dan DB belum diset
    return {
        enabled: false,
        message: DEFAULT_MAINTENANCE_MESSAGE,
    };
}
