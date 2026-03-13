import { google, type drive_v3 } from "googleapis";

export type GoogleDriveConfig = {
    clientEmail: string;
    privateKey: string;
    rootFolderId: string;
    sharedDriveId?: string;
};

let _drive: drive_v3.Drive | null = null;
let _config: GoogleDriveConfig | null = null;

function requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} env variable is not set`);
    }
    return value;
}

function getConfig(): GoogleDriveConfig {
    if (_config) return _config;

    _config = {
        clientEmail: requiredEnv("GOOGLE_DRIVE_CLIENT_EMAIL"),
        privateKey: requiredEnv("GOOGLE_DRIVE_PRIVATE_KEY").replace(
            /\\n/g,
            "\n",
        ),
        rootFolderId: requiredEnv("GOOGLE_DRIVE_ROOT_FOLDER_ID"),
        sharedDriveId: process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || undefined,
    };

    return _config;
}

export function getGoogleDriveClient(): {
    drive: drive_v3.Drive;
    config: GoogleDriveConfig;
} {
    if (typeof window !== "undefined") {
        throw new Error("Google Drive client must only run on server side");
    }

    if (_drive && _config) {
        return { drive: _drive, config: _config };
    }

    const config = getConfig();

    const auth = new google.auth.JWT({
        email: config.clientEmail,
        key: config.privateKey,
        scopes: ["https://www.googleapis.com/auth/drive"],
    });

    _drive = google.drive({ version: "v3", auth });

    return { drive: _drive, config };
}
