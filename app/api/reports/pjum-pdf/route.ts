import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generatePjumPdf } from "@/lib/pdf/generate-pjum-pdf";
import { getAuthUser } from "@/lib/authorization";

const _assetsDir = path.join(process.cwd(), "public", "assets");
let ALFAMART_LOGO_BASE64 = "";
try {
    ALFAMART_LOGO_BASE64 = fs
        .readFileSync(path.join(_assetsDir, "Alfamart-Emblem-small.png"))
        .toString("base64");
} catch {
    // Render without logo if assets are missing
}

export async function GET(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== "BMC") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sp = request.nextUrl.searchParams;
    const idsParam = sp.get("ids");
    const bmsNIK = sp.get("bmsNIK") ?? "";
    const from = sp.get("from") ?? "";
    const to = sp.get("to") ?? "";

    if (!idsParam) {
        return NextResponse.json(
            { error: "Missing ids parameter" },
            { status: 400 },
        );
    }

    const reportNumbers = idsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    if (reportNumbers.length === 0) {
        return NextResponse.json(
            { error: "No report IDs provided" },
            { status: 400 },
        );
    }

    try {
        const reports = await prisma.report.findMany({
            where: {
                reportNumber: { in: reportNumbers },
                branchName: { in: user.branchNames },
                // Only allow PDF generation for reports that have been PJUM-exported
                pjumExportedAt: { not: null },
            },
            select: {
                reportNumber: true,
                createdAt: true,
                storeName: true,
                storeCode: true,
                branchName: true,
                status: true,
                totalEstimation: true,
                createdByNIK: true,
                createdBy: { select: { name: true } },
                pjumExportedAt: true,
            },
            orderBy: { createdAt: "asc" },
        });

        if (reports.length === 0) {
            return NextResponse.json(
                { error: "No accessible reports found" },
                { status: 404 },
            );
        }

        const bmsUser = await prisma.user.findUnique({
            where: { NIK: bmsNIK || reports[0].createdByNIK },
            select: { name: true, NIK: true },
        });

        const exportedAt =
            reports[0].pjumExportedAt?.toISOString() ??
            new Date().toISOString();

        const branchName =
            user.branchNames.length === 1
                ? user.branchNames[0]
                : reports[0].branchName;

        const pdfBuffer = await generatePjumPdf({
            bmsName: bmsUser?.name ?? bmsNIK,
            bmsNIK: bmsUser?.NIK ?? bmsNIK,
            bmcName: user.name,
            branchName,
            from: from || reports[0].createdAt.toISOString(),
            to: to || reports[reports.length - 1].createdAt.toISOString(),
            exportedAt,
            reports: reports.map((r) => ({
                reportNumber: r.reportNumber,
                createdAt: r.createdAt.toISOString(),
                storeName: r.storeName,
                storeCode: r.storeCode,
                branchName: r.branchName,
                status: r.status as string,
                totalEstimation: Number(r.totalEstimation),
            })),
            alfamartLogoBase64: ALFAMART_LOGO_BASE64,
        });

        const fileName = `PJUM-${bmsUser?.NIK ?? bmsNIK}-${from || "export"}.pdf`;

        return new NextResponse(pdfBuffer as unknown as BodyInit, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${fileName}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        logger.error(
            { operation: "generatePjumPdf", bmsNIK },
            "Failed to generate PJUM PDF",
            error,
        );
        return NextResponse.json(
            { error: "Failed to generate PJUM PDF" },
            { status: 500 },
        );
    }
}
