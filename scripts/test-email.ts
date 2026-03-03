import "dotenv/config";
import nodemailer from "nodemailer";
import { google } from "googleapis";
import { buildReportSubmittedHtml } from "../lib/email/templates/report-submitted";

const OAuth2 = google.auth.OAuth2;

async function createTransporter() {
    const oauth2Client = new OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        "https://developers.google.com/oauthplayground",
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    const accessToken = await oauth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.GMAIL_USER,
            clientId: process.env.GMAIL_CLIENT_ID,
            clientSecret: process.env.GMAIL_CLIENT_SECRET,
            refreshToken: process.env.GMAIL_REFRESH_TOKEN,
            accessToken: accessToken.token ?? undefined,
        },
    });

    return transporter;
}

async function main() {
    console.log("Memulai simulasi pengiriman email...");

    // Validate config presence
    const requiredEnv = [
        "GMAIL_USER",
        "GMAIL_CLIENT_ID",
        "GMAIL_CLIENT_SECRET",
        "GMAIL_REFRESH_TOKEN",
        "DEV_EMAIL_RECIPIENT",
        "NEXT_PUBLIC_APP_URL",
    ];
    const missing = requiredEnv.filter((k) => !process.env[k]);
    if (missing.length > 0) {
        console.error(`❌ Konfigurasi .env kurang: ${missing.join(", ")}`);
        process.exit(1);
    }

    try {
        const targetEmail =
            process.env.DEV_EMAIL_RECIPIENT || process.env.GMAIL_USER!;

        const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
            /\/$/,
            "",
        );
        const dummyReviewUrl = `${appUrl}/reports/RPT-2026-TEST-001`;

        // Build email HTML using the real template
        const html = buildReportSubmittedHtml({
            reportNumber: "RPT-2026-TEST-001",
            storeName: "Alfamart Test Store",
            storeCode: "ALF-9999",
            branchName: "Cabang Jakarta Utara",
            submittedBy: "Budi Santoso",
            submittedAt: new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }),
            rusakItems: 7,
            bmsItems: 4,
            rekananItems: 3,
            totalEstimation: 4_750_000,
            reviewUrl: dummyReviewUrl,
        });

        console.log(`Mencoba mengirim email ke: ${targetEmail}`);

        const transporter = await createTransporter();

        await transporter.sendMail({
            from: `"SPARTA Maintenance" <${process.env.GMAIL_USER}>`,
            to: targetEmail,
            subject:
                "[TEST] Laporan Maintenance Baru: RPT-2026-TEST-001 — Alfamart Test Store",
            html,
        });

        console.log("✅ SUKSES! Email dengan tombol review berhasil dikirim.");
        console.log(`   Review URL (direct): ${dummyReviewUrl}`);
    } catch (error: unknown) {
        console.error("❌ GAGAL! Terjadi kesalahan saat mengirim email:");
        const err = error as { response?: unknown; message?: string };
        if (err.response) {
            console.error("Detail Error API:", err.response);
        } else {
            console.error(err.message || error);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => process.exit(0));
