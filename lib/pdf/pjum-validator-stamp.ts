import "server-only";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

function dataUrlToBytes(dataUrl: string): Uint8Array {
    const base64 = dataUrl.split(",")[1];
    if (!base64) throw new Error("Invalid QR data URL");
    return Uint8Array.from(Buffer.from(base64, "base64"));
}

export async function stampPjumValidatorOnPackage(input: {
    buffer: Buffer;
    qrDataUrl: string;
    displayCode: string;
    skipPageIndexes: number[];
}): Promise<Buffer> {
    const pdf = await PDFDocument.load(input.buffer);
    const qrImage = await pdf.embedPng(dataUrlToBytes(input.qrDataUrl));
    const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    const skip = new Set(input.skipPageIndexes);

    pdf.getPages().forEach((page, index) => {
        if (skip.has(index)) return;

        const { width } = page.getSize();
        const qrSize = 44;
        const x = width - 72;
        const y = 18;

        page.drawRectangle({
            x: x - 4,
            y: y - 4,
            width: qrSize + 8,
            height: qrSize + 22,
            color: rgb(1, 1, 1),
            opacity: 0.92,
        });

        page.drawImage(qrImage, {
            x,
            y: y + 18,
            width: qrSize,
            height: qrSize,
        });

        page.drawText("Validasi dokumen SPARTA", {
            x: x - 22,
            y: y + 9,
            size: 5.5,
            font: regularFont,
            color: rgb(0, 0, 0),
        });

        page.drawText(input.displayCode, {
            x: x - 2,
            y,
            size: 5.5,
            font: boldFont,
            color: rgb(0, 0, 0),
        });
    });

    return Buffer.from(await pdf.save());
}
