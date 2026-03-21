import "server-only";

import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email/mailer";
import { buildPjumApprovedHtml } from "@/lib/email/templates/pjum-approved";
import { logger } from "@/lib/logger";

/**
 * Send PJUM PDF to all Branch Admins in the given branch.
 * Fire-and-forget: caller should .catch() to avoid unhandled rejections.
 */
export async function sendPjumNotification(params: {
    branchName: string;
    pdfBuffer: Buffer;
    bmsName: string;
    weekNumber: number;
    monthName: string;
    year: number;
}): Promise<void> {
    const startTime = Date.now();
    const correlationId = crypto.randomUUID();

    logger.info(
        {
            operation: "sendPjumNotification",
            correlationId,
            branchName: params.branchName,
        },
        "Starting PJUM email notification",
    );

    // Find all Branch Admins for this branch
    const branchAdminUsers = await prisma.user.findMany({
        where: {
            role: "BRANCH_ADMIN" as const,
            branchNames: { has: params.branchName },
        },
        select: { email: true, name: true },
    });

    const recipients: { email: string; name: string }[] = [
        ...branchAdminUsers,
    ];

    if (recipients.length === 0) {
        // Fallback to dev email
        const devEmail = process.env.DEV_EMAIL_RECIPIENT;
        if (!devEmail) {
            logger.warn(
                {
                    operation: "sendPjumNotification",
                    correlationId,
                    branchName: params.branchName,
                },
                "No Branch Admin found and no dev fallback configured",
            );
            return;
        }
        recipients.push({ email: devEmail, name: "Dev Recipient" });
    }

    const recipientEmails = recipients.map((ba) => ba.email);
    const fileName = `PJUM ${params.monthName} minggu ke ${params.weekNumber}.pdf`;

    const html = buildPjumApprovedHtml({
        bmsName: params.bmsName,
        weekNumber: params.weekNumber,
        monthName: params.monthName,
        year: params.year,
        branchName: params.branchName,
    });

    await sendEmail({
        to: recipientEmails,
        subject: `[SPARTA MAINTENANCE] PJUM Disetujui: ${params.bmsName} — Minggu ke-${params.weekNumber} ${params.monthName} ${params.year}`,
        html,
        attachments: [
            {
                filename: fileName,
                content: params.pdfBuffer,
                contentType: "application/pdf",
            },
        ],
    });

    logger.info(
        {
            operation: "sendPjumNotification",
            correlationId,
            recipients: recipientEmails,
            duration: Date.now() - startTime,
        },
        "PJUM email sent",
    );
}
