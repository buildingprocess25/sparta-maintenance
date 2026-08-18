// TODO: Hapus atau nonaktifkan route ini di production.
// Ini hanya untuk keperluan testing dan preview layout form PJUM.

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
            periodeFrom: new Date(2026, 2, 1).toISOString(),
            periodeTo: new Date(2026, 2, 7).toISOString(),
        };

        const pdfBuffer = await generatePjumFormPdf(mockPjumData);

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
