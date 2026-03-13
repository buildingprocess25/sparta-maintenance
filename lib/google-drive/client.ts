import { google, type drive_v3 } from "googleapis";

export type GoogleDriveConfig = {
    rootFolderId: string;
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

    const oauth2Client = new google.auth.OAuth2(
        requiredEnv("GOOGLE_CLIENT_ID"),
        requiredEnv("GOOGLE_CLIENT_SECRET"),
    );
    oauth2Client.setCredentials({
        refresh_token: requiredEnv("GOOGLE_REFRESH_TOKEN"),
    });

    _drive = google.drive({ version: "v3", auth: oauth2Client });
    _config = {
        rootFolderId: requiredEnv("GOOGLE_DRIVE_ROOT_FOLDER_ID"),
    };

    return { drive: _drive, config: _config };
}
