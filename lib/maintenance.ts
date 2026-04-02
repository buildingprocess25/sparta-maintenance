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
    const enabled = parseBooleanFlag(process.env.MAINTENANCE_MODE);
    const message = process.env.MAINTENANCE_MESSAGE?.trim();

    return {
        enabled,
        message:
            message && message.length > 0
                ? message
                : DEFAULT_MAINTENANCE_MESSAGE,
    };
}
