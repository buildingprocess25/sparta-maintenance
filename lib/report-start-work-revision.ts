export function parseStartWorkPhotoUrls(raw: unknown): string[] {
    if (Array.isArray(raw)) {
        return raw.filter(
            (value): value is string =>
                typeof value === "string" && value.trim().length > 0,
        );
    }

    if (typeof raw !== "string") return [];

    const value = raw.trim();
    if (!value) return [];

    if (value.startsWith("[")) {
        try {
            return parseStartWorkPhotoUrls(JSON.parse(value));
        } catch {
            return [];
        }
    }

    return [value];
}

export function serializeStartWorkSelfieUrls(urls: string[]): string | null {
    const validUrls = urls
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

    if (validUrls.length === 0) return null;
    if (validUrls.length === 1) return validUrls[0];
    return JSON.stringify(validUrls);
}
