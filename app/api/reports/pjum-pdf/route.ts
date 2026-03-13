import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { generatePjumPackagePdf } from "@/lib/pdf/generate-pjum-package-pdf";
import { getAuthUser } from "@/lib/authorization";

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

        return new NextResponse(buffer as unknown as BodyInit, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${fileName}"`,
                "Cache-Control": "no-store",
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
