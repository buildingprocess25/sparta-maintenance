import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { getGoogleDriveClient } from "@/lib/google-drive/client";
import { getDriveCdnClient } from "@/lib/google-drive/cdn-client";
import {
    escapeHtml,
    parseDriveProxyTarget,
    safeContentDispositionFilename,
} from "@/lib/google-drive/dev-proxy";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const GOOGLE_DOC_EXPORTS: Record<string, { mimeType: string; extension: string }> = {
    "application/vnd.google-apps.document": {
        mimeType: "application/pdf",
        extension: ".pdf",
    },
    "application/vnd.google-apps.spreadsheet": {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        extension: ".xlsx",
    },
    "application/vnd.google-apps.presentation": {
        mimeType: "application/pdf",
        extension: ".pdf",
    },
};

type DriveSource = "archive" | "cdn";

function isDevProxyAllowed(request: NextRequest): boolean {
    if (process.env.NODE_ENV !== "development") return false;

    const secret = process.env.DEV_DRIVE_PROXY_SECRET?.trim();
    if (!secret) return true;

    const requestUrl = new URL(request.url);
    return (
        request.headers.get("x-dev-drive-proxy-secret") === secret ||
        requestUrl.searchParams.get("secret") === secret
    );
}

function getDriveClient(source: DriveSource) {
    return source === "cdn" ? getDriveCdnClient().drive : getGoogleDriveClient().drive;
}

function streamToWebReadable(stream: Readable): ReadableStream<Uint8Array> {
    return new ReadableStream({
        start(controller) {
            stream.on("data", (chunk: Buffer) => {
                controller.enqueue(new Uint8Array(chunk));
            });
            stream.on("end", () => controller.close());
            stream.on("error", (error: Error) => controller.error(error));
        },
        cancel() {
            stream.destroy();
        },
    });
}

function devProxyHref(requestUrl: URL, params: Record<string, string>): string {
    const next = new URL(requestUrl);
    next.search = "";
    for (const [key, value] of Object.entries(params)) {
        next.searchParams.set(key, value);
    }
    const secret = requestUrl.searchParams.get("secret");
    if (secret) next.searchParams.set("secret", secret);
    return `${next.pathname}${next.search}`;
}

function htmlResponse(html: string, status = 200) {
    return new NextResponse(html, {
        status,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });
}

function renderInputPage(message?: string) {
    return htmlResponse(`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dev Drive Proxy</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 32px; line-height: 1.5; }
    form { display: grid; gap: 12px; max-width: 760px; }
    input, select, button { font: inherit; padding: 10px 12px; }
    input { width: 100%; box-sizing: border-box; }
    .hint { color: #555; font-size: 14px; }
    .error { color: #b00020; }
  </style>
</head>
<body>
  <h1>Dev Drive Proxy</h1>
  ${message ? `<p class="error">${escapeHtml(message)}</p>` : ""}
  <form method="get">
    <label>
      Drive URL atau file/folder ID
      <input name="url" placeholder="https://drive.google.com/file/d/... atau folder ID" autofocus />
    </label>
    <label>
      Credential source
      <select name="source">
        <option value="archive">GOOGLE_* / arsip laporan</option>
        <option value="cdn">DRIVE_CDN_* / foto CDN</option>
      </select>
    </label>
    <button type="submit">Buka via Proxy</button>
  </form>
  <p class="hint">Endpoint ini hanya aktif saat <code>NODE_ENV=development</code>.</p>
</body>
</html>`);
}

async function renderFolderListing(params: {
    requestUrl: URL;
    folderId: string;
    folderName: string;
    source: DriveSource;
}) {
    const { requestUrl, folderId, folderName, source } = params;
    const drive = getDriveClient(source);
    const files = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: "files(id,name,mimeType,size,modifiedTime)",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        orderBy: "folder,name",
        pageSize: 200,
    });

    const rows = (files.data.files ?? [])
        .map((file) => {
            if (!file.id || !file.name) return "";
            const isFolder = file.mimeType === FOLDER_MIME_TYPE;
            const href = devProxyHref(requestUrl, {
                id: file.id,
                source,
            });
            const size = file.size ? `${Number(file.size).toLocaleString("id-ID")} B` : "";
            return `<tr>
  <td>${isFolder ? "Folder" : "File"}</td>
  <td><a href="${escapeHtml(href)}">${escapeHtml(file.name)}</a></td>
  <td>${escapeHtml(file.mimeType ?? "")}</td>
  <td>${escapeHtml(size)}</td>
</tr>`;
        })
        .join("");

    return htmlResponse(`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(folderName)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; line-height: 1.45; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f7f7f7; }
    a { color: #0b57d0; }
  </style>
</head>
<body>
  <p><a href="${escapeHtml(devProxyHref(requestUrl, {}))}">Kembali ke form proxy</a></p>
  <h1>${escapeHtml(folderName)}</h1>
  <table>
    <thead><tr><th>Tipe</th><th>Nama</th><th>MIME</th><th>Ukuran</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="4">Folder kosong atau tidak ada akses.</td></tr>`}</tbody>
  </table>
</body>
</html>`);
}

async function streamDriveFile(params: {
    fileId: string;
    source: DriveSource;
    name: string;
    mimeType: string;
}) {
    const { fileId, source, name, mimeType } = params;
    const drive = getDriveClient(source);
    const exportConfig = GOOGLE_DOC_EXPORTS[mimeType];
    const fileName = safeContentDispositionFilename(
        exportConfig && !name.endsWith(exportConfig.extension)
            ? `${name}${exportConfig.extension}`
            : name,
    );

    const response = exportConfig
        ? await drive.files.export(
              {
                  fileId,
                  mimeType: exportConfig.mimeType,
              },
              { responseType: "stream" },
          )
        : await drive.files.get(
              {
                  fileId,
                  alt: "media",
                  supportsAllDrives: true,
              },
              { responseType: "stream" },
          );

    return new NextResponse(streamToWebReadable(response.data as Readable), {
        headers: {
            "Content-Type": exportConfig?.mimeType ?? mimeType,
            "Content-Disposition": `inline; filename="${fileName}"`,
            "Cache-Control": "no-store",
        },
    });
}

export async function GET(request: NextRequest) {
    if (!isDevProxyAllowed(request)) {
        return NextResponse.json({ error: "Dev Drive Proxy hanya untuk development." }, { status: 404 });
    }

    const requestUrl = new URL(request.url);
    const source = requestUrl.searchParams.get("source") === "cdn" ? "cdn" : "archive";
    const target = parseDriveProxyTarget(
        requestUrl.searchParams.get("id") ?? requestUrl.searchParams.get("url"),
    );

    if (!target) {
        return renderInputPage();
    }

    try {
        const drive = getDriveClient(source);
        const file = await drive.files.get({
            fileId: target.id,
            fields: "id,name,mimeType,size",
            supportsAllDrives: true,
        });

        const name = file.data.name ?? target.id;
        const mimeType = file.data.mimeType ?? "application/octet-stream";

        if (mimeType === FOLDER_MIME_TYPE) {
            return renderFolderListing({
                requestUrl,
                folderId: target.id,
                folderName: name,
                source,
            });
        }

        return streamDriveFile({
            fileId: target.id,
            source,
            name,
            mimeType,
        });
    } catch (error) {
        logger.error(
            {
                operation: "GET /api/dev/drive-proxy",
                source,
                fileId: target.id,
                errorMessage: error instanceof Error ? error.message : String(error),
            },
            "Failed to proxy Drive file in development",
        );

        return renderInputPage(
            "Gagal membuka file/folder. Pastikan credential punya akses dan source sudah benar.",
        );
    }
}
