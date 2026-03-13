import dotenv from "dotenv";
import { getGoogleDriveClient } from "@/lib/google-drive/client";

dotenv.config();

async function main() {
    const { drive, config } = getGoogleDriveClient();

    const folder = await drive.files.get({
        fileId: config.rootFolderId,
        fields: "id,name,mimeType,webViewLink",
        supportsAllDrives: true,
    });

    if (!folder.data.id) {
        throw new Error("Root folder not found or inaccessible");
    }

    console.log("Google Drive setup OK");
    console.log(`Folder ID: ${folder.data.id}`);
    console.log(`Folder Name: ${folder.data.name ?? "(unknown)"}`);
    console.log(`Folder Type: ${folder.data.mimeType ?? "(unknown)"}`);
    if (folder.data.webViewLink) {
        console.log(`Folder Link: ${folder.data.webViewLink}`);
    }
}

main().catch((error) => {
    console.error("Google Drive setup check failed");
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: unknown }).response === "object"
    ) {
        const response = (
            error as {
                response?: {
                    data?: unknown;
                    status?: number;
                    statusText?: string;
                };
            }
        ).response;
        if (response?.status) {
            console.error(
                `HTTP ${response.status} ${response.statusText ?? ""}`,
            );
        }
        if (response?.data) {
            console.error(JSON.stringify(response.data, null, 2));
        }
    }
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
