import crypto from "node:crypto";

export type PjumPublicVerificationStatus =
    | "VALID"
    | "NEEDS_REVIEW"
    | "INVALID";

export function generatePjumVerificationSecret(): {
    token: string;
    code: string;
} {
    return {
        token: crypto.randomBytes(24).toString("base64url"),
        code: crypto.randomBytes(4).toString("hex").toUpperCase(),
    };
}

export function formatPjumVerificationDisplayCode(code: string): string {
    return `PJUM-${code.trim().toUpperCase()}`;
}

export function buildPjumVerificationUrl(input: {
    baseUrl?: string | null;
    token: string;
}): string {
    const configured =
        input.baseUrl?.trim() ||
        process.env.APP_BASE_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim();

    if (!configured) {
        throw new Error(
            "APP_BASE_URL or NEXT_PUBLIC_APP_URL is required for PJUM verification QR URLs",
        );
    }

    const url = new URL(configured);
    url.pathname = `/v/pjum/${encodeURIComponent(input.token)}`;
    url.search = "";
    url.hash = "";
    return url.toString();
}

export function derivePjumPublicVerificationStatus(input: {
    status: string;
    approvedAt: Date | null;
    approvedByNIK: string | null;
    pjumFinalDriveUrl: string | null;
}): PjumPublicVerificationStatus {
    if (input.status === "APPROVED") {
        return input.approvedAt &&
            input.approvedByNIK &&
            input.pjumFinalDriveUrl
            ? "VALID"
            : "NEEDS_REVIEW";
    }

    if (input.status === "PENDING_APPROVAL") return "NEEDS_REVIEW";
    return "INVALID";
}
