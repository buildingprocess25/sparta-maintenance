import "server-only";

import QRCode from "qrcode";

export async function createQrPngDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
        errorCorrectionLevel: "M",
        margin: 3,
        width: 192,
        color: {
            dark: "#000000",
            light: "#FFFFFF",
        },
    });
}
