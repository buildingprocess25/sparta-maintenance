import "server-only";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email/mailer";
import { buildReportSubmittedHtml } from "@/lib/email/templates/report-submitted";
import { generateReportPdf } from "@/lib/pdf/generate-report-pdf";
import { logger } from "@/lib/logger";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";

export async function sendReportNotification(reportId: string): Promise<void> {
    const report = await prisma.report.findUnique({
        where: { reportNumber: reportId },
        include: {
            createdBy: {
                select: { name: true, email: true },
            },
        },
    });

    if (!report) {
        logger.error(
            { operation: "sendReportNotification", reportId },
            "Report not found",
        );
        return;
    }

    const items = (report.items ?? []) as unknown as ReportItemJson[];
    const estimations = (report.estimations ??
        []) as unknown as MaterialEstimationJson[];

    const rusakItems = items.filter(
        (i) => i.condition === "RUSAK" || i.preventiveCondition === "NOT_OK",
    );
    const bmsItems = items.filter((i) => i.handler === "BMS");
    const rekananItems = items.filter((i) => i.handler === "REKANAN");

    const submittedAt = new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    // Find the BMC reviewer for this branch
    //   Production: picks first BMC whose branchNames includes this report's branch
    //   Dev fallback: uses DEV_EMAIL_RECIPIENT
    let recipientEmail: string | undefined;

    const bmcUser = await prisma.user.findFirst({
        where: {
            role: "BMC",
            branchNames: { has: report.branchName },
        },
        select: { email: true },
    });

    if (bmcUser) {
        recipientEmail = bmcUser.email;
    } else {
        // Dev fallback
        recipientEmail = process.env.DEV_EMAIL_RECIPIENT;
    }

    if (!recipientEmail) {
        logger.error(
            { operation: "sendReportNotification" },
            "No recipient email configured",
        );
        return;
    }

    // Build the direct report URL. If the recipient is not logged in, the
    // report page will redirect them to /login?redirect=<path> and return
    // after authentication.
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const reviewUrl = appUrl
        ? `${appUrl}/reports/${report.reportNumber}`
        : undefined;

    const assetsDir = path.join(process.cwd(), "public", "assets");
    const alfamartLogoBase64 = fs
        .readFileSync(path.join(assetsDir, "Alfamart-Emblem-small.png"))
        .toString("base64");
    const buildingLogoBase64 = fs
        .readFileSync(path.join(assetsDir, "Building-Logo.png"))
        .toString("base64");

    // Generate PDF
    const pdfBuffer = await generateReportPdf({
        reportNumber: report.reportNumber,
        storeName: report.storeName,
        storeCode: report.storeCode || "-",
        branchName: report.branchName,
        submittedBy: report.createdBy.name,
        submittedAt,
        items,
        estimations,
        totalEstimation: Number(report.totalEstimation),
        alfamartLogoBase64,
        buildingLogoBase64,
        approval: {
            reportStatus: report.status,
        },
    });

    // Build HTML email
    const html = buildReportSubmittedHtml({
        reportNumber: report.reportNumber,
        storeName: report.storeName,
        storeCode: report.storeCode || "-",
        branchName: report.branchName,
        submittedBy: report.createdBy.name,
        submittedAt,
        rusakItems: rusakItems.length,
        bmsItems: bmsItems.length,
        rekananItems: rekananItems.length,
        totalEstimation: Number(report.totalEstimation),
        reviewUrl,
    });

    await sendEmail({
        to: recipientEmail,
        subject: `[SPARTA MAINTENANCE] Laporan Baru: ${report.reportNumber} — ${report.storeName}`,
        html,
        attachments: [
            {
                filename: `Laporan-${report.reportNumber}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf",
            },
        ],
    });

    logger.info(
        {
            operation: "sendReportNotification",
            reportId: report.reportNumber,
            recipientEmail,
        },
        "Email sent",
    );
}
