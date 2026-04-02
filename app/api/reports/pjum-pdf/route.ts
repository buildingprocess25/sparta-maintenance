import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generatePjumPackagePdf } from "@/lib/pdf/generate-pjum-package-pdf";
import { getAuthUser } from "@/lib/authorization";
import {
    buildPjumSnapshotPath,
    downloadPdfSnapshot,
    uploadPdfSnapshot,
} from "@/lib/pdf/snapshot-storage";

export async function GET(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || (user.role !== "BMC" && user.role !== "BNM_MANAGER")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sp = request.nextUrl.searchParams;
    const idsParam = sp.get("ids");
    const bmsNIK = sp.get("bmsNIK") ?? "";
    const from = sp.get("from") ?? "";
    const to = sp.get("to") ?? "";
    const weekNumber = Number(sp.get("week") ?? "0");

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

    if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 5) {
        return NextResponse.json(
            { error: "Minggu ke harus di antara 1 sampai 5" },
            { status: 400 },
        );
    }

    try {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        let exportRecord: { id: string; pjumPdfPath: string | null } | null =
            null;

        if (
            !Number.isNaN(fromDate.getTime()) &&
            !Number.isNaN(toDate.getTime())
        ) {
            const candidates = await prisma.pjumExport.findMany({
                where: {
                    bmsNIK,
                    weekNumber,
                    fromDate,
                    toDate,
                    branchName: { in: user.branchNames },
                },
                select: {
                    id: true,
                    reportNumbers: true,
                    pjumPdfPath: true,
                },
                orderBy: { createdAt: "desc" },
                take: 5,
            });

            exportRecord =
                candidates.find((item) => {
                    const a = [...item.reportNumbers].sort();
                    const b = [...reportNumbers].sort();
                    return (
                        a.length === b.length && a.every((v, i) => v === b[i])
                    );
                }) ?? null;
        }

        if (exportRecord?.pjumPdfPath) {
            const snapshot = await downloadPdfSnapshot(
                exportRecord.pjumPdfPath,
            );
            if (snapshot) {
                return new NextResponse(snapshot as unknown as BodyInit, {
                    headers: {
                        "Content-Type": "application/pdf",
                        "Content-Disposition": `inline; filename="pjum-${bmsNIK}-w${weekNumber}.pdf"`,
                        "Cache-Control": "private, max-age=3600, immutable",
                        "X-PDF-Source": "snapshot",
                    },
                });
            }
        }

        const { buffer, fileName } = await generatePjumPackagePdf({
            reportNumbers,
            bmsNIK,
            from,
            to,
            weekNumber,
            requireExported: true,
            requester: {
                NIK: user.NIK,
                name: user.name,
                branchNames: user.branchNames,
            },
        });

        if (exportRecord) {
            const snapshotPath = buildPjumSnapshotPath({
                branchName: user.branchNames[0] ?? "unknown",
                bmsNIK,
                weekNumber,
                from,
                to,
                version: String(Date.now()),
            });

            await uploadPdfSnapshot(snapshotPath, buffer);
            await prisma.pjumExport.update({
                where: { id: exportRecord.id },
                data: { pjumPdfPath: snapshotPath },
            });
        }

        return new NextResponse(buffer as unknown as BodyInit, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${fileName}"`,
                "Cache-Control": "private, max-age=3600, immutable",
                "X-PDF-Source": "generated",
            },
        });
    } catch (error) {
        logger.error(
            { operation: "generatePjumPdf", bmsNIK, weekNumber },
            "Failed to generate PJUM PDF",
            error,
        );
        return NextResponse.json(
            { error: "Failed to generate PJUM PDF" },
            { status: 500 },
        );
    }
}
