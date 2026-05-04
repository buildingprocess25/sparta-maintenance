import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
    generateReportPdf,
    ReportPdfData,
} from "@/lib/pdf/generate-report-pdf";

// Pixel merah 1x1 untuk placeholder logo
const PLACEHOLDER_LOGO =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const PLACEHOLDER_STORE_PHOTO_1 =
    "https://placehold.co/1200x800.png?text=Store+1";
const PLACEHOLDER_STORE_PHOTO_2 =
    "https://placehold.co/900x1200.png?text=Store+2";

export async function GET() {
    // Disable this preview endpoint on public deployments.
    if (process.env.NODE_ENV === "production") {
        return new NextResponse("Not Found", { status: 404 });
    }

    try {
        const mockData: ReportPdfData = {
            reportNumber: "RPT-2024-001",
            storeName: "Alfamart Jend. Sudirman",
            storeCode: "SAT1",
            branchName: "Cabang Jakarta Pusat",
            submittedBy: "Budi Santoso (BMS)",
            submittedAt: "Senin, 12 Februari 2024 - 14:30",
            finishedAt: "Rabu, 14 Februari 2024 - 10:30",
            totalEstimation: 1500000,
            alfamartLogoBase64: PLACEHOLDER_LOGO,
            buildingLogoBase64: PLACEHOLDER_LOGO,
            completionSelfieUrls: [],
            startReceiptUrls: [],
            startMaterialStores: [
                {
                    name: "TB Makmur Jaya",
                    city: "Jakarta",
                    photoUrls: [
                        PLACEHOLDER_STORE_PHOTO_1,
                        PLACEHOLDER_STORE_PHOTO_2,
                    ],
                },
                { name: "Sumber Bangunan", city: "Depok" },
            ],
            completionNotes: undefined,
            completionAdditionalPhotos: [],
            completionAdditionalNote: undefined,
            approval: {
                reportStatus: "COMPLETED",
                stamps: [
                    {
                        action: "WORK_APPROVED",
                        approverName: "Dimas Bagas",
                        approverNIK: "12345678",
                        approverRole: "BMC",
                        approvedAt: "Selasa, 13 Februari 2024 - 09:00",
                    },
                    {
                        action: "FINAL_APPROVED_BNM",
                        approverName: "Budi Santoso",
                        approverNIK: "87654321",
                        approverRole: "BNM_MANAGER",
                        approvedAt: "Rabu, 14 Februari 2024 - 10:30",
                    },
                ],
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
        logger.error(
            { operation: "previewPdf" },
            "Failed to generate PDF preview",
            error,
        );
        return NextResponse.json(
            { error: "Gagal membuat PDF preview" },
            { status: 500 },
        );
    }
}
