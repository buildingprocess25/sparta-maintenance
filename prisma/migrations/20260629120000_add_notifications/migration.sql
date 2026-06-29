CREATE TYPE "NotificationType" AS ENUM (
    'REPORT_SUBMITTED',
    'REPORT_ESTIMATION_APPROVED',
    'REPORT_ESTIMATION_REJECTED_REVISION',
    'REPORT_ESTIMATION_REJECTED',
    'REPORT_WORK_STARTED',
    'REPORT_COMPLETION_SUBMITTED',
    'REPORT_WORK_APPROVED',
    'REPORT_WORK_REJECTED_REVISION',
    'REPORT_FINAL_APPROVED',
    'REPORT_FINAL_REJECTED_REVISION',
    'PJUM_CREATED',
    'PJUM_APPROVED',
    'PJUM_REJECTED',
    'REPORT_INTERVENTION_CREATED'
);

CREATE TYPE "NotificationEntityType" AS ENUM (
    'REPORT',
    'PJUM',
    'INTERVENTION'
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientNIK" TEXT NOT NULL,
    "actorNIK" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "entityType" "NotificationEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "reportNumber" TEXT,
    "pjumExportId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userNIK" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "deviceLabel" TEXT,
    "disabledAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "Notification_recipientNIK_readAt_createdAt_idx" ON "Notification"("recipientNIK", "readAt", "createdAt");
CREATE INDEX "Notification_recipientNIK_createdAt_idx" ON "Notification"("recipientNIK", "createdAt");
CREATE INDEX "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");
CREATE INDEX "Notification_reportNumber_idx" ON "Notification"("reportNumber");
CREATE INDEX "Notification_pjumExportId_idx" ON "Notification"("pjumExportId");
CREATE INDEX "PushSubscription_userNIK_disabledAt_idx" ON "PushSubscription"("userNIK", "disabledAt");

ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_recipientNIK_fkey"
    FOREIGN KEY ("recipientNIK") REFERENCES "User"("NIK")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_actorNIK_fkey"
    FOREIGN KEY ("actorNIK") REFERENCES "User"("NIK")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PushSubscription"
    ADD CONSTRAINT "PushSubscription_userNIK_fkey"
    FOREIGN KEY ("userNIK") REFERENCES "User"("NIK")
    ON DELETE RESTRICT ON UPDATE CASCADE;
