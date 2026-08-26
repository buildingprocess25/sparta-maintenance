import { google, type drive_v3 } from "googleapis";

export type DriveCdnConfig = {
    rootFolderId: string;
};

let _cdnDrive: drive_v3.Drive | null = null;
let _cdnConfig: DriveCdnConfig | null = null;
let _legacyRootWarningLogged = false;

function requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} env variable is not set`);
    }
    return value;
}

export function resolveDriveCdnRoot(env: {
    GOOGLE_DRIVE_ROOT_FOLDER_ID?: string;
    DRIVE_CDN_ROOT_FOLDER_ID?: string;
}): string {
    const canonicalRoot = env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();
    if (canonicalRoot) return canonicalRoot;

    const legacyRoot = env.DRIVE_CDN_ROOT_FOLDER_ID?.trim();
    if (legacyRoot) return legacyRoot;

    throw new Error(
        "GOOGLE_DRIVE_ROOT_FOLDER_ID env variable is not set. DRIVE_CDN_ROOT_FOLDER_ID is supported only as a compatibility fallback.",
    );
}

export function getDriveCdnClient(): {
    drive: drive_v3.Drive;
    config: DriveCdnConfig;
} {
    if (typeof window !== "undefined") {
        throw new Error("Drive CDN client must only run on server side");
    }

    if (_cdnDrive && _cdnConfig) {
        return { drive: _cdnDrive, config: _cdnConfig };
    }

    const oauth2Client = new google.auth.OAuth2(
        requiredEnv("DRIVE_CDN_CLIENT_ID"),
        requiredEnv("DRIVE_CDN_CLIENT_SECRET"),
    );
    oauth2Client.setCredentials({
        refresh_token: requiredEnv("DRIVE_CDN_REFRESH_TOKEN"),
    });

    _cdnDrive = google.drive({ version: "v3", auth: oauth2Client });
    const rootFolderId = resolveDriveCdnRoot({
        GOOGLE_DRIVE_ROOT_FOLDER_ID: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
        DRIVE_CDN_ROOT_FOLDER_ID: process.env.DRIVE_CDN_ROOT_FOLDER_ID,
    });
    if (
        !process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID &&
        process.env.DRIVE_CDN_ROOT_FOLDER_ID &&
        !_legacyRootWarningLogged
    ) {
        console.warn(
            "DRIVE_CDN_ROOT_FOLDER_ID is deprecated for Drive CDN root selection; set GOOGLE_DRIVE_ROOT_FOLDER_ID instead.",
        );
        _legacyRootWarningLogged = true;
    }

    _cdnConfig = { rootFolderId };

    return { drive: _cdnDrive, config: _cdnConfig };
}
