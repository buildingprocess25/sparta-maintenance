import { NextResponse } from "next/server";
import {
    generateReportPdf,
    ReportPdfData,
} from "@/lib/pdf/generate-report-pdf";

// Pixel merah 1x1 untuk placeholder logo
const PLACEHOLDER_LOGO =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export async function GET() {
    try {
        const mockData: ReportPdfData = {
            reportNumber: "RPT-2024-001",
            storeName: "Alfamart Jend. Sudirman",
            storeCode: "SAT1",
            branchName: "Cabang Jakarta Pusat",
            submittedBy: "Budi Santoso (BMS)",
            submittedAt: "Senin, 12 Februari 2024 - 14:30",
            totalEstimation: 1500000,
            alfamartLogoBase64: PLACEHOLDER_LOGO,
            buildingLogoBase64: PLACEHOLDER_LOGO,
            approval: {
                status: "APPROVED",
                approvedBy: "Dimas Bagas",
                approvedAt: "Selasa, 13 Februari 2024 - 09:00",
                // notes: "Mohon cek kembali estimasi harga engsel, terlalu mahal.",
            },
            items: [
                {
                    itemId: "A1",
                    itemName: "Pintu Kaca Utama",
                    categoryName: "A. Bagian Depan Bangunan",
                    condition: "RUSAK",
                    preventiveCondition: "NOT_OK",
                    handler: "REKANAN",
                    photoUrl: null,
                },
                {
                    itemId: "A2",
                    itemName: "Lantai Teras",
                    categoryName: "A. Bagian Depan Bangunan",
                    condition: "BAIK",
                    preventiveCondition: "OK",
                    handler: null,
                    photoUrl: null,
                },
                {
                    itemId: "B1",
                    itemName: "Lampu Neon Box",
                    categoryName: "B. Area Sales",
                    condition: "RUSAK",
                    preventiveCondition: "NOT_OK",
                    handler: "BMS",
                    photoUrl: null,
                },
            ],
            estimations: [
                {
                    itemId: "A1",
                    materialName: "Engsel Lantai Dorma",
                    quantity: 1,
                    unit: "pcs",
                    price: 1200000,
                    totalPrice: 1200000,
                },
                {
                    itemId: "B1",
                    materialName: "Starter Lampu TL",
                    quantity: 2,
                    unit: "pcs",
                    price: 150000,
                    totalPrice: 300000,
                },
            ],
        };

        const pdfBuffer = await generateReportPdf(mockData);

        return new NextResponse(pdfBuffer as unknown as BodyInit, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": 'inline; filename="preview_report.pdf"',
            },
        });
    } catch (error) {
        console.error("PDF Generate Error:", error);
        return NextResponse.json(
            { error: "Gagal membuat PDF preview" },
            { status: 500 },
        );
    }
}
