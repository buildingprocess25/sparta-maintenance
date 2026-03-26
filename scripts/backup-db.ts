/**
 * Automated database backup script
 * Exports Supabase PostgreSQL database to .sql file and uploads to Google Drive
 *
 * Usage:
 *   npx tsx scripts/backup-db.ts
 *
 * Requires env vars:
 *   - DATABASE_URL (Supabase connection string)
 *   - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 *   - BACKUP_DRIVE_FOLDER_ID (Google Drive folder ID to store backups)
 */

import "dotenv/config";
import { exec } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { google } from "googleapis";

const execAsync = promisify(exec);

interface BackupResult {
    success: boolean;
    filename: string;
    size: number;
    driveFileId?: string;
    error?: string;
}

function requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing env var: ${name}`);
    }
    return value;
}

async function backupDatabase(): Promise<string> {
    const databaseUrl = requiredEnv("DATABASE_URL");
    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
    const backupDir = join(process.cwd(), "backups");
    const backupFile = join(backupDir, `sparta-db-${timestamp}.sql`);

    // Create backups directory if not exists
    await fs.mkdir(backupDir, { recursive: true });

    console.log(`📦 Starting database backup...`);
    console.log(`   Destination: ${backupFile}`);

    try {
        // Use pg_dump to export database
        // PGPASSWORD is extracted from DATABASE_URL
        const dumpCommand = `pg_dump "${databaseUrl}" > "${backupFile}"`;

        const { stderr } = await execAsync(dumpCommand, {
            env: { ...process.env },
            maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        });

        if (stderr && !stderr.includes("notice")) {
            console.warn("⚠️  pg_dump warnings:", stderr);
        }

        const stats = await fs.stat(backupFile);
        const sizeKb = Math.round(stats.size / 1024);

        console.log(`✅ Database backup completed: ${sizeKb} KB`);
        return backupFile;
    } catch (error) {
        console.error("❌ Database backup failed:", error);
        throw error;
    }
}

async function uploadToGoogleDrive(
    backupFile: string,
): Promise<string | undefined> {
    const clientId = requiredEnv("GOOGLE_CLIENT_ID");
    const clientSecret = requiredEnv("GOOGLE_CLIENT_SECRET");
    const refreshToken = requiredEnv("GOOGLE_REFRESH_TOKEN");
    const folderId = process.env.BACKUP_DRIVE_FOLDER_ID;

    if (!folderId) {
        console.warn(
            "⚠️  BACKUP_DRIVE_FOLDER_ID not set, skipping Drive upload",
        );
        return;
    }

    console.log(`📤 Uploading to Google Drive...`);

    try {
        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            "https://developers.google.com/oauthplayground",
        );

        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        const fileContent = await fs.readFile(backupFile);
        const filename = backupFile.split("/").pop() || "backup.sql";

        const response = await drive.files.create({
            requestBody: {
                name: filename,
                mimeType: "text/plain",
                parents: [folderId],
                description: `SPARTA DB backup - ${new Date().toISOString()}`,
            },
            media: {
                mimeType: "text/plain",
                body: fileContent as Buffer,
            },
        });

        if (response.data.id) {
            console.log(`✅ Uploaded to Drive: ${response.data.id}`);
            return response.data.id;
        }
    } catch (error) {
        console.error("❌ Google Drive upload failed:", error);
        // Don't fail entirely if Drive upload fails
    }
}

async function cleanupOldBackups(daysToKeep: number = 30): Promise<void> {
    const backupDir = join(process.cwd(), "backups");
    const cutoffDate = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    try {
        const files = await fs.readdir(backupDir);

        for (const file of files) {
            if (!file.endsWith(".sql")) continue;

            const filepath = join(backupDir, file);
            const stats = await fs.stat(filepath);

            if (stats.mtimeMs < cutoffDate) {
                await fs.unlink(filepath);
                console.log(`🗑️  Deleted old backup: ${file}`);
            }
        }
    } catch {
        // Directory might not exist yet
    }
}

async function main(): Promise<BackupResult> {
    try {
        // 1. Export database
        const backupFile = await backupDatabase();

        // 2. Upload to Google Drive
        const driveFileId = await uploadToGoogleDrive(backupFile);

        // 3. Cleanup old local backups (keep 30 days)
        await cleanupOldBackups(30);

        const stats = await fs.stat(backupFile);

        console.log(`\n✨ Backup completed successfully!`);
        console.log(`   File: ${backupFile}`);
        console.log(`   Size: ${Math.round(stats.size / 1024)} KB`);
        if (driveFileId) {
            console.log(`   Drive ID: ${driveFileId}`);
        }

        return {
            success: true,
            filename: backupFile,
            size: stats.size,
            driveFileId,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Backup failed: ${message}`);

        return {
            success: false,
            filename: "",
            size: 0,
            error: message,
        };
    }
}

main().then((result) => {
    process.exit(result.success ? 0 : 1);
});
