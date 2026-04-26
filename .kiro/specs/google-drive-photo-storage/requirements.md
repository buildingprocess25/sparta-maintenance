# Requirements Document

## Introduction

This feature replaces UploadThing as the primary photo storage backend with Google Drive on a dedicated second Google account, used exclusively as a CDN for all report photos in the BMS maintenance app. Photos are served via the `https://lh3.googleusercontent.com/d/{fileID}` URL format. UploadThing is retained as a fallback for legacy reports that already have photos stored there.

After a report reaches its final state — status `COMPLETED` AND included in a PJUM export with status `APPROVED` — all Google Drive photos for that report are deleted by a GitHub Actions cron job. The existing archive script (`scripts/archive-approved-pjum-photos.ts`) provides the reference logic for identifying eligible reports.

All photo upload flows are under the BMS role and cover: checklist item photos, start-work selfie and receipt photos, and completion additional photos. These photos are used in report detail views, report PDF generation, and PJUM PDF generation.

## Glossary

- **Photo_Storage_Service**: The abstraction layer that routes photo uploads and URL resolution between Google Drive CDN and UploadThing fallback.
- **Google_Drive_CDN**: The second Google account's Google Drive, used exclusively for storing and serving new report photos via `https://lh3.googleusercontent.com/d/{fileID}`.
- **UploadThing**: The existing file storage service, retained as a fallback for legacy photos only.
- **Drive_File_ID**: The unique identifier of a file in Google Drive, used to construct the CDN URL `https://lh3.googleusercontent.com/d/{fileID}`.
- **CDN_URL**: A Google Drive direct-access image URL in the format `https://lh3.googleusercontent.com/d/{fileID}`.
- **Legacy_Photo**: A photo whose URL points to UploadThing (i.e., does not match the CDN_URL pattern).
- **New_Photo**: A photo uploaded after this feature is deployed, stored in Google_Drive_CDN and served via CDN_URL.
- **BMS**: Building Maintenance Staff — the role responsible for creating and submitting maintenance reports and uploading all photos.
- **BMC**: Building Maintenance Coordinator — reviews and approves reports.
- **BnM_Manager**: Building and Maintenance Manager — gives final approval.
- **Report**: A maintenance report entity identified by `reportNumber`, containing checklist items, start-work data, and completion data.
- **PJUM**: Pengajuan Uang Muka — a weekly expense claim export that groups multiple reports.
- **Cron_Job**: A GitHub Actions scheduled workflow that runs the photo deletion script for eligible reports.
- **Photo_Category**: One of three categories — `checklist`, `startwork`, or `completion` — that determines the subfolder in Google Drive.
- **Drive_Photo_Key**: A JSON field on the `Report` model (`drivePhotoFileIds`) that stores the list of Google Drive file IDs for photos uploaded via the new flow.
- **UploadThing_File_Key**: The existing `uploadthingFileKeys` JSON field on the `Report` model, retained for legacy cleanup.
- **Second_Google_Account**: The dedicated Google account used exclusively for Google_Drive_CDN, configured via a separate set of environment variables (`DRIVE_CDN_CLIENT_ID`, `DRIVE_CDN_CLIENT_SECRET`, `DRIVE_CDN_REFRESH_TOKEN`, `DRIVE_CDN_ROOT_FOLDER_ID`).

---

## Requirements

### Requirement 1: Dedicated Google Drive CDN Client

**User Story:** As a system operator, I want photo uploads to use a dedicated second Google account, so that CDN photo storage is isolated from the primary Google Drive account used for PDFs and archival.

#### Acceptance Criteria

1. THE Photo_Storage_Service SHALL initialize a Google Drive client using environment variables `DRIVE_CDN_CLIENT_ID`, `DRIVE_CDN_CLIENT_SECRET`, `DRIVE_CDN_REFRESH_TOKEN`, and `DRIVE_CDN_ROOT_FOLDER_ID`, separate from the existing `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, and `GOOGLE_DRIVE_ROOT_FOLDER_ID` variables used by the primary account.
2. IF any of the four `DRIVE_CDN_*` environment variables are missing at initialization, THEN THE Photo_Storage_Service SHALL throw a descriptive error identifying the missing variable name.
3. THE Photo_Storage_Service SHALL make the CDN Drive client accessible only on the server side.

---

### Requirement 2: Photo Upload to Google Drive CDN

**User Story:** As a BMS, I want my photos to be uploaded to Google Drive CDN, so that photos are served reliably via a stable CDN URL.

#### Acceptance Criteria

1. WHEN a BMS uploads a checklist photo, start-work selfie, start-work receipt, or completion photo, THE Photo_Storage_Service SHALL upload the compressed image to Google_Drive_CDN and return a CDN_URL in the format `https://lh3.googleusercontent.com/d/{fileID}`.
2. WHEN a photo is uploaded to Google_Drive_CDN, THE Photo_Storage_Service SHALL set the file's sharing permission to "anyone with the link can view" so the CDN_URL is publicly accessible.
3. WHEN a photo upload to Google_Drive_CDN succeeds, THE Photo_Storage_Service SHALL return both the CDN_URL and the Drive_File_ID to the caller.
4. IF a photo upload to Google_Drive_CDN fails after 3 retry attempts, THEN THE Photo_Storage_Service SHALL return a failure result without falling back to UploadThing for new uploads.
5. THE Photo_Storage_Service SHALL accept a compressed image `File` or `Blob` as input and upload it directly without re-compressing.

---

### Requirement 3: Drive File ID Persistence

**User Story:** As a system operator, I want Google Drive file IDs stored on the Report, so that the cron job can identify and delete photos for eligible reports.

#### Acceptance Criteria

1. WHEN a photo is successfully uploaded to Google_Drive_CDN, THE Photo_Storage_Service SHALL append the Drive_File_ID to the `drivePhotoFileIds` JSON array field on the associated `Report`.
2. THE Report model SHALL include a `drivePhotoFileIds` field of type `Json` with a default value of `[]`, storing the list of Drive_File_IDs for all photos uploaded via the new flow.
3. WHEN a photo is deleted from Google_Drive_CDN, THE Photo_Storage_Service SHALL remove the corresponding Drive_File_ID from the `drivePhotoFileIds` array on the `Report`.

---

### Requirement 4: Photo URL Resolution (CDN vs Legacy Fallback)

**User Story:** As a BMS viewing a report, I want photos to display correctly regardless of whether they were uploaded before or after this feature was deployed, so that legacy reports are not broken.

#### Acceptance Criteria

1. WHEN a photo URL matches the pattern `https://lh3.googleusercontent.com/d/`, THE Photo_Storage_Service SHALL treat it as a New_Photo and serve it directly without modification.
2. WHEN a photo URL does not match the CDN_URL pattern, THE Photo_Storage_Service SHALL treat it as a Legacy_Photo and serve it via the existing UploadThing URL resolution path.
3. THE Photo_Storage_Service SHALL expose a pure function `isGoogleDriveCdnUrl(url: string): boolean` that returns `true` if and only if the URL starts with `https://lh3.googleusercontent.com/d/`.
4. FOR ALL valid CDN_URLs, `isGoogleDriveCdnUrl(url)` SHALL return `true`, and for all non-CDN URLs, `isGoogleDriveCdnUrl(url)` SHALL return `false` (round-trip discriminator property).

---

### Requirement 5: Report Detail Photo Display

**User Story:** As a BMS or BMC viewing a report detail page, I want all photos to render correctly, so that I can review the report's visual documentation.

#### Acceptance Criteria

1. WHEN a report detail page renders a photo URL that is a CDN_URL, THE Report_Detail_View SHALL display the image using the CDN_URL directly as the `src`.
2. WHEN a report detail page renders a photo URL that is a Legacy_Photo URL, THE Report_Detail_View SHALL display the image using the existing UploadThing URL.
3. THE Report_Detail_View SHALL render checklist item photos, start-work selfie photos, start-work receipt photos, and completion additional photos using the same URL resolution logic.

---

### Requirement 6: PDF Generation with CDN Photos

**User Story:** As a BMC or BnM Manager generating a report PDF or PJUM PDF, I want photos to be embedded correctly regardless of storage backend, so that PDFs are complete and accurate.

#### Acceptance Criteria

1. WHEN the PDF generator fetches a photo for embedding, THE PDF_Generator SHALL fetch the image bytes from the CDN_URL directly for New_Photos.
2. WHEN the PDF generator fetches a photo for embedding, THE PDF_Generator SHALL fetch the image bytes from the UploadThing URL for Legacy_Photos.
3. IF fetching a photo URL returns a non-2xx HTTP response, THEN THE PDF_Generator SHALL skip that photo and continue generating the PDF without it, logging the failure.

---

### Requirement 7: Cron Job Photo Deletion for Approved PJUM Reports

**User Story:** As a system operator, I want photos for fully approved reports to be automatically deleted from Google Drive CDN, so that storage costs are controlled after reports are finalized.

#### Acceptance Criteria

1. WHEN the Cron_Job runs, THE Cron_Job SHALL query for all reports whose `reportNumber` appears in a `PjumExport` with `status = APPROVED` and `approvedAt IS NOT NULL`, and whose `Report.status = COMPLETED`.
2. FOR EACH eligible report, THE Cron_Job SHALL delete all Drive_File_IDs listed in `drivePhotoFileIds` directly from Google_Drive_CDN using the Second_Google_Account credentials. No archiving or moving of files is performed — files are deleted outright.
3. WHEN all Drive_File_IDs for a report are successfully deleted, THE Cron_Job SHALL clear the `drivePhotoFileIds` array to `[]` on that `Report`.
4. IF a Drive file deletion fails for a specific file ID, THEN THE Cron_Job SHALL log the failure with the file ID and report number, and continue processing remaining files without aborting the run.
5. THE Cron_Job SHALL also process Legacy_Photos for eligible reports using the existing UploadThing archive-and-delete logic (as implemented in `scripts/archive-approved-pjum-photos.ts`), so that both storage backends are cleaned up in a single run.
6. THE Cron_Job SHALL support a `--dry-run` flag that logs planned deletions without performing any actual deletions or database updates.
7. WHEN the Cron_Job completes, THE Cron_Job SHALL output a summary including: total reports processed, total Drive files deleted, total Drive deletion failures, and total UploadThing keys processed.

---

### Requirement 8: Upload API Route for Google Drive CDN

**User Story:** As a BMS using the web app, I want photo uploads to be handled by a server-side API route, so that Google Drive credentials are never exposed to the client.

#### Acceptance Criteria

1. THE Upload_API SHALL expose a server-side Next.js API route that accepts a multipart image upload and returns a `{ url: string; fileId: string }` response on success.
2. WHEN a request to the Upload_API is made by an unauthenticated user, THE Upload_API SHALL return HTTP 401.
3. WHEN a request to the Upload_API is made by a user without the BMS role, THE Upload_API SHALL return HTTP 403.
4. WHEN the Upload_API receives a valid image, THE Upload_API SHALL compress the image to a maximum of 70 KB and 1280px on the longest side before uploading to Google_Drive_CDN.
5. IF the uploaded file is not an image MIME type, THEN THE Upload_API SHALL return HTTP 400 with a descriptive error message.
6. THE Upload_API SHALL accept images up to 4 MB before compression.

---

### Requirement 9: Client-Side Upload Hook

**User Story:** As a BMS using the web app, I want a consistent upload interface, so that all photo capture flows work the same way regardless of the storage backend.

#### Acceptance Criteria

1. THE Photo_Upload_Hook SHALL expose a `uploadPhoto(file: File): Promise<{ url: string; fileId: string } | null>` function that uploads to Google_Drive_CDN via the Upload_API route.
2. WHEN an upload succeeds, THE Photo_Upload_Hook SHALL return the CDN_URL and Drive_File_ID.
3. WHEN an upload fails, THE Photo_Upload_Hook SHALL return `null` and log the error to the console.
4. THE Photo_Upload_Hook SHALL replace all existing calls to `compressAndUploadToUT` in checklist photo, start-work photo, and completion photo flows.

---

### Requirement 10: Backward Compatibility — UploadThing Retained for Legacy

**User Story:** As a system operator, I want UploadThing to remain functional for existing reports, so that legacy photo URLs continue to resolve and display correctly.

#### Acceptance Criteria

1. THE Photo_Storage_Service SHALL NOT remove or disable the UploadThing API route (`/api/uploadthing`) or its file router configuration.
2. THE Photo_Storage_Service SHALL NOT delete or modify any existing `uploadthingFileKeys` values on existing `Report` records.
3. WHEN a Legacy_Photo URL is encountered anywhere in the app (report detail, PDF generation, cron job), THE system SHALL resolve and use it via the existing UploadThing URL path without error.
