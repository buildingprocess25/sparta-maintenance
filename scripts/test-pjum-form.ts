import fs from "fs";
import { generatePjumFormPdf } from "../lib/pdf/generate-pjum-form-pdf";

async function run() {
    try {
        const buffer = await generatePjumFormPdf({
            weekNumber: 1,
            monthName: "Agustus",
            year: 2026,
            bmsName: "Rendi",
            submissionDate: new Date().toISOString(),
            totalExpenditure: 1200000,
            periodeFrom: new Date("2026-07-30").toISOString(),
            periodeTo: new Date("2026-08-07").toISOString(),
            verification: {
                qrDataUrl:
                    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
                displayCode: "PJUM-AB12CD34",
            },
        });
        console.log("PASS: PDF generated, size: " + buffer.length);
    } catch (err) {
        console.error("FAIL:", err);
        process.exit(1);
    }
}
run();
