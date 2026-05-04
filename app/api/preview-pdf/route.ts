import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
    generateReportPdf,
    type ReportPdfData,
} from "@/lib/pdf/generate-report-pdf";

export const runtime = "nodejs";

// Pixel merah 1x1 untuk placeholder logo
const PLACEHOLDER_LOGO =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const PLACEHOLDER_PHOTO_BASE_URL =
    "https://m2yt2b581h.ufs.sh/f/R5k7xTQ0dNorl0mKWavu7pLxitEHhBUTvyeWjZFCfnJDN621";

function placeholderPhotoUrl(label: string, width: number, height: number) {
    const encodedLabel = encodeURIComponent(label);
    return `${PLACEHOLDER_PHOTO_BASE_URL}?preview=${encodedLabel}_${width}x${height}.jpg`;
}

function buildMockData(mode: "completed" | "pending"): ReportPdfData {
    const beforeA1 = placeholderPhotoUrl("before-a1-landscape", 1400, 900);
    const afterA1 = placeholderPhotoUrl("after-a1-portrait", 900, 1400);
    const beforeB1 = placeholderPhotoUrl("before-b1-portrait", 820, 1280);
    const afterB1 = placeholderPhotoUrl("after-b1-landscape", 1280, 820);

    const selfie1 = placeholderPhotoUrl("selfie-1", 1200, 900);
    const selfie2 = placeholderPhotoUrl("selfie-2", 900, 1200);
    const receipt1 = placeholderPhotoUrl("receipt-1", 1100, 700);
    const receipt2 = placeholderPhotoUrl("receipt-2", 700, 1100);
    const store1 = placeholderPhotoUrl("store-1", 1200, 800);
    const store2 = placeholderPhotoUrl("store-2", 900, 1200);
    const additional1 = placeholderPhotoUrl("additional-1", 1000, 700);
    const additional2 = placeholderPhotoUrl("additional-2", 700, 1000);

    const base: ReportPdfData = {
        reportNumber: "RPT-DEV-2026-0001",
        storeName: "Alfamart Sudirman 01",
        storeCode: "SAT1001",
        branchName: "Cabang Jakarta Pusat",
        submittedBy: "Budi Santoso",
        submittedByNIK: "12345678",
        submittedAt: "Selasa, 14 April 2026 - 09:30",
        totalEstimation: 1500000,
        alfamartLogoBase64: PLACEHOLDER_LOGO,
        buildingLogoBase64: PLACEHOLDER_LOGO,
        completionSelfieUrls: mode === "completed" ? [selfie1, selfie2] : [],
        startReceiptUrls: mode === "completed" ? [receipt1, receipt2] : [],
        startMaterialStores: [
            {
                name: "TB Makmur Jaya",
                city: "Jakarta",
                photoUrls: mode === "completed" ? [store1, store2] : [],
            },
            { name: "Sumber Bangunan", city: "Depok" },
        ],
        completionNotes:
            mode === "completed"
                ? "Perbaikan sudah selesai dan area kerja sudah dirapikan."
                : undefined,
        completionAdditionalPhotos:
            mode === "completed" ? [additional1, additional2] : [],
        completionAdditionalNote:
            mode === "completed"
                ? "Penempatan material sudah dipisah sesuai area kerja."
                : undefined,
        approval: {
            reportStatus:
                mode === "completed" ? "COMPLETED" : "PENDING_ESTIMATION",
            stamps:
                mode === "completed"
                    ? [
                          {
                              action: "WORK_APPROVED",
                              approverName: "Dimas Bagas",
                              approverNIK: "87654321",
                              approverRole: "BMC",
                              approvedAt: "Rabu, 15 April 2026 - 10:00",
                          },
                          {
                              action: "FINAL_APPROVED_BNM",
                              approverName: "Rina Lestari",
                              approverNIK: "99887766",
                              approverRole: "BNM_MANAGER",
                              approvedAt: "Rabu, 15 April 2026 - 11:15",
                          },
                      ]
                    : [
                          {
                              action: "ESTIMATION_APPROVED",
                              approverName: "Dimas Bagas",
                              approverNIK: "87654321",
                              approverRole: "BMC",
                              approvedAt: "Rabu, 15 April 2026 - 10:00",
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
                images: mode === "completed" ? [beforeA1] : [],
                afterImages: mode === "completed" ? [afterA1] : [],
                notes: "Engsel longgar dan pintu tidak menutup rapat.",
                realisasiItems:
                    mode === "completed"
                        ? [
                              {
                                  materialName: "Engsel Lantai Dorma",
                                  quantity: 1,
                                  unit: "pcs",
                                  price: 1180000,
                                  totalPrice: 1180000,
                              },
                          ]
                        : [],
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
                images: mode === "completed" ? [beforeB1] : [],
                afterImages: mode === "completed" ? [afterB1] : [],
                notes: "Starter lampu mati.",
                realisasiItems:
                    mode === "completed"
                        ? [
                              {
                                  materialName: "Starter Lampu TL",
                                  quantity: 2,
                                  unit: "pcs",
                                  price: 140000,
                                  totalPrice: 280000,
                              },
                          ]
                        : [],
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

    if (mode === "completed") {
        base.finishedAt = "Rabu, 15 April 2026 - 11:20";
    }

    return base;
}

export async function GET(request: NextRequest) {
    // Route ini hanya untuk development/staging internal.
    if (process.env.NODE_ENV === "production") {
        return new NextResponse("Not Found", { status: 404 });
    }

    const mode =
        request.nextUrl.searchParams.get("mode") === "pending"
            ? "pending"
            : "completed";

    try {
        const pdfBuffer = await generateReportPdf(buildMockData(mode));

        return new NextResponse(pdfBuffer as unknown as BodyInit, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="preview_report_${mode}.pdf"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        logger.error(
            { operation: "previewPdfDev", mode },
            "Failed to generate development PDF preview",
            error,
        );
        return NextResponse.json(
            { error: "Gagal membuat PDF preview development" },
            { status: 500 },
        );
    }
}
