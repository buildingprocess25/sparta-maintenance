import "server-only";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email/mailer";
import { buildReportSubmittedHtml } from "@/lib/email/templates/report-submitted";
import { generateReportPdf } from "@/lib/pdf/generate-report-pdf";
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
        console.error(`[sendReportNotification] Report not found: ${reportId}`);
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

    // Determine recipient email
    // TODO: Di production, ganti logika ini untuk mengambil email BMC dari DB
    //       berdasarkan branchName yang sama dengan laporan ini.
    //       Contoh: const bmcUser = await prisma.user.findFirst({
    //                 where: { role: "BMC", branchName: report.branchName }
    //               });
    //               const recipientEmail = bmcUser?.email;
    const recipientEmail = process.env.DEV_EMAIL_RECIPIENT;

    if (!recipientEmail) {
        console.error(
            "[sendReportNotification] No recipient email configured. Set DEV_EMAIL_RECIPIENT in .env",
        );
        return;
    }

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
            status: "PENDING",
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

    console.log(
        `[sendReportNotification] Email sent for report ${report.reportNumber} to ${recipientEmail}`,
    );
}
