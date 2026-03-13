import "server-only";
import nodemailer from "nodemailer";
import { google } from "googleapis";

const OAuth2 = google.auth.OAuth2;

async function createTransporter() {
    const oauth2Client = new OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        "https://developers.google.com/oauthplayground",
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const accessToken = await oauth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.GMAIL_USER,
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
            accessToken: accessToken.token ?? undefined,
        },
    });

    return transporter;
}

export type SendEmailOptions = {
    to: string | string[];
    subject: string;
    html: string;
    attachments?: {
        filename: string;
        content: Buffer;
        contentType: string;
    }[];
};

export async function sendEmail(options: SendEmailOptions): Promise<void> {
    // ── EMAIL DISABLED ──────────────────────────────────────────────────────
    // Email sending is intentionally disabled. Remove this block to re-enable.
    console.warn(
        "[mailer] sendEmail called but email is disabled. Recipient:",
        options.to,
        "| Subject:",
        options.subject,
    );
    return;
    // ── END DISABLE ─────────────────────────────────────────────────────────

    const transporter = await createTransporter();

    await transporter.sendMail({
        from: `"SPARTA Maintenance" <${process.env.GMAIL_USER}>`,
        to: Array.isArray(options.to)
            ? (options.to as string[]).join(", ")
            : (options.to as string),
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
    });
}
