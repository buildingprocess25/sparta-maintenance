// TODO: Hapus atau nonaktifkan route ini di production.
// Ini hanya untuk keperluan testing dan preview layout form PJUM & PUM.

import { NextResponse } from "next/server";
import { generatePjumFormPdf } from "@/lib/pdf/generate-pjum-form-pdf";
import { logger } from "@/lib/logger";

export async function GET() {
    if (process.env.NODE_ENV === "production") {
        return new NextResponse("Not Found", { status: 404 });
    }

    try {
        // Mock data for PJUM
        const mockPjumData = {
            weekNumber: 2,
            monthName: "Maret",
            year: 2026,
            bmsName: "Budi Santoso",
            submissionDate: new Date().toISOString(),
            totalExpenditure: 750000,
            allowanceAmount: 1000000,
            difference: 250000,
        };

        // Mock data for PUM
        const mockPumData = {
            bmsName: "Budi Santoso",
            bmsNIK: "BMS-12345",
            bankAccountNo: "1234567890",
            bankAccountName: "Budi Santoso",
            bankName: "BCA",
            pumWeekNumber: 2,
            pumMonth: "Maret",
            pumYear: 2026,
            branchName: "Branch Jakarta",
        };

        const pdfBuffer = await generatePjumFormPdf(mockPjumData, mockPumData);

        // Return the buffer as a PDF response
        return new NextResponse(pdfBuffer as unknown as BodyInit, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": "inline; filename=preview-pjum-form.pdf",
            },
        });
    } catch (error) {
        logger.error(
            { operation: "previewPjumPdf" },
            "Failed to generate preview PDF",
            error,
        );
        return NextResponse.json(
            { error: "Gagal membuat preview PDF" },
            { status: 500 },
        );
    }
}
