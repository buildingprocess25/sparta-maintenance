export type DriveProxyTarget = {
    id: string;
    kind: "file" | "folder" | "unknown";
};

const GOOGLE_DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{10,}$/;

export function parseDriveProxyTarget(input: string | null): DriveProxyTarget | null {
    const value = input?.trim();
    if (!value) return null;

    if (GOOGLE_DRIVE_ID_PATTERN.test(value)) {
        return { id: value, kind: "unknown" };
    }

    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return null;
    }

    const queryId = url.searchParams.get("id");
    if (queryId && GOOGLE_DRIVE_ID_PATTERN.test(queryId)) {
        return { id: queryId, kind: "unknown" };
    }

    const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
    if (fileMatch?.[1] && GOOGLE_DRIVE_ID_PATTERN.test(fileMatch[1])) {
        return { id: fileMatch[1], kind: "file" };
    }

    const folderMatch = url.pathname.match(/\/folders\/([^/]+)/);
    if (folderMatch?.[1] && GOOGLE_DRIVE_ID_PATTERN.test(folderMatch[1])) {
        return { id: folderMatch[1], kind: "folder" };
    }

    const cdnMatch = url.pathname.match(/^\/d\/([^/=]+)/);
    if (
        url.hostname === "lh3.googleusercontent.com" &&
        cdnMatch?.[1] &&
        GOOGLE_DRIVE_ID_PATTERN.test(cdnMatch[1])
    ) {
        return { id: cdnMatch[1], kind: "file" };
    }

    return null;
}

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function safeContentDispositionFilename(name: string): string {
    const cleaned = name.trim().replace(/[^\w .()-]+/g, "_");
    return cleaned || "drive-file";
}
