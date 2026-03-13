import "dotenv/config";
import http from "node:http";
import { google } from "googleapis";

const PORT = 3005;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/oauth2/callback`;
const SCOPES = [
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/drive",
];

function requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} env variable is not set`);
    }
    return value;
}

async function main() {
    const clientId = requiredEnv("GOOGLE_CLIENT_ID");
    const clientSecret = requiredEnv("GOOGLE_CLIENT_SECRET");

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        REDIRECT_URI,
    );

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: SCOPES,
    });

    console.log(
        "Buka URL berikut di browser lalu login dengan akun Google yang akan dipakai:",
    );
    console.log(authUrl);
    console.log("");
    console.log(`Menunggu callback di ${REDIRECT_URI} ...`);

    await new Promise<void>((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            try {
                const url = new URL(req.url ?? "/", REDIRECT_URI);
                if (url.pathname !== "/oauth2/callback") {
                    res.writeHead(404);
                    res.end("Not found");
                    return;
                }

                const error = url.searchParams.get("error");
                if (error) {
                    res.writeHead(400, {
                        "Content-Type": "text/plain; charset=utf-8",
                    });
                    res.end(`OAuth gagal: ${error}`);
                    server.close();
                    reject(
                        new Error(`OAuth callback returned error: ${error}`),
                    );
                    return;
                }

                const code = url.searchParams.get("code");
                if (!code) {
                    res.writeHead(400, {
                        "Content-Type": "text/plain; charset=utf-8",
                    });
                    res.end("Kode OAuth tidak ditemukan");
                    server.close();
                    reject(new Error("OAuth callback did not include code"));
                    return;
                }

                const { tokens } = await oauth2Client.getToken(code);
                res.writeHead(200, {
                    "Content-Type": "text/plain; charset=utf-8",
                });
                res.end("Autentikasi berhasil. Kembali ke terminal.");
                server.close();

                console.log("");
                console.log("Refresh token baru:");
                console.log(
                    tokens.refresh_token ??
                        "(tidak ada refresh token diterima)",
                );
                console.log("");
                console.log("Pasang ke .env sebagai GOOGLE_REFRESH_TOKEN.");

                if (!tokens.refresh_token) {
                    reject(
                        new Error(
                            "Google tidak mengembalikan refresh token. Hapus grant lama di akun Google lalu ulangi dengan prompt=consent.",
                        ),
                    );
                    return;
                }

                resolve();
            } catch (error) {
                server.close();
                reject(error);
            }
        });

        server.listen(PORT, "127.0.0.1");
    });
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
