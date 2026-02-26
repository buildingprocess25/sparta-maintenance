import "dotenv/config";
import nodemailer from "nodemailer";
import { google } from "googleapis";

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
    ];
    const missing = requiredEnv.filter((k) => !process.env[k]);
    if (missing.length > 0) {
        console.error(`❌ Konfigurasi .env kurang: ${missing.join(", ")}`);
        process.exit(1);
    }

    try {
        const targetEmail =
            process.env.DEV_EMAIL_RECIPIENT || process.env.GMAIL_USER!;

        console.log(`Mencoba mengirim email ke: ${targetEmail}`);

        const transporter = await createTransporter();

        await transporter.sendMail({
            from: `"SPARTA Maintenance" <${process.env.GMAIL_USER}>`,
            to: targetEmail,
            subject: "TEST EMAIL SPARTA MAINTENANCE",
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2 style="color: #4CAF50;">✅ Koneksi Berhasil!</h2>
                    <p>Halo,</p>
                    <p>Konfigurasi GMAIL_REFRESH_TOKEN Anda berhasil divalidasi dan aplikasi kini siap mengirim email.</p>
                    <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">
                    <small style="color: #666;">Dikirim secara otomatis oleh Sparta Maintenance System</small>
                </div>
            `,
        });

        console.log("✅ SUKSES! Email berhasil dikirim.");
    } catch (error: any) {
        console.error("❌ GAGAL! Terjadi kesalahan saat mengirim email:");
        if (error.response) {
            console.error(
                "Detail Error API:",
                error.response.data || error.response,
            );
        } else {
            console.error(error.message || error);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => process.exit(0));
