import "server-only";

/**
 * @deprecated QR code is now embedded directly in react-pdf footers.
 * This stub exists only to satisfy any remaining imports; it returns the buffer unchanged.
 */
export async function stampPjumValidatorOnPackage(input: {
    buffer: Buffer;
    qrDataUrl: string;
    displayCode: string;
    skipPageIndexes: number[];
}): Promise<Buffer> {
    return input.buffer;
}
