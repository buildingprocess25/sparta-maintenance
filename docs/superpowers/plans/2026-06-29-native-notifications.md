# Native Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build persistent in-app notifications plus mandatory PWA/Web Push device notifications for SPARTA Maintenance business workflows.

**Architecture:** Store every business notification in PostgreSQL as the source of truth, then deliver Web Push best-effort outside the business transaction. Add a client-side notification gate in the authenticated shell so supported devices cannot use `/dashboard/*` or `/reports/*` until notification permission and subscription are active.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7, PostgreSQL, `web-push`, existing PWA service worker, shadcn/ui (`dropdown-menu`, `button`, `badge`, `scroll-area`, `alert`, `dialog`, `skeleton`, `empty`, `separator`, `tooltip`).

---

## Branch and Safety

Work from `codex/native-notifications-spec`, not `main`.

Before implementation:

```bash
git switch codex/native-notifications-spec
git status --short --branch
```

Expected:

```text
## codex/native-notifications-spec
```

Do not run `prisma migrate deploy` against production during implementation. Create migration files only.

## Source Spec

Use this spec as the requirement source:

- `docs/superpowers/specs/2026-06-29-native-notifications-design.md`

## shadcn Scan Result

`npx shadcn@latest list '@shadcn'` confirmed relevant shadcn components exist:

- `@shadcn/dropdown-menu`
- `@shadcn/button`
- `@shadcn/badge`
- `@shadcn/scroll-area`
- `@shadcn/alert`
- `@shadcn/dialog`
- `@shadcn/skeleton`
- `@shadcn/empty`
- `@shadcn/separator`
- `@shadcn/tooltip`
- `@shadcn/avatar`

Use existing local files under `components/ui/*` before creating any custom primitive.

## File Structure

Create:

- `lib/notifications/types.ts` — shared notification event and payload types.
- `lib/notifications/templates.ts` — maps business events to title/body/href/entity metadata.
- `lib/notifications/recipients.ts` — resolves BMS/BMC/BNM recipients by report or PJUM scope.
- `lib/notifications/push.ts` — configures `web-push`, sends payloads, disables expired subscriptions.
- `lib/notifications/dispatch.ts` — creates notification rows and triggers push delivery.
- `lib/notifications/templates.spec.ts` — executable TS test for templates.
- `lib/notifications/recipients.spec.ts` — executable TS test for pure recipient filtering helpers.
- `lib/web-push/client.ts` — client-side VAPID conversion and subscription helpers.
- `scripts/generate-vapid-keys.ts` — local helper for generating VAPID keys.
- `app/api/push/subscribe/route.ts` — authenticated subscribe/upsert endpoint.
- `app/api/push/unsubscribe/route.ts` — authenticated endpoint to disable current endpoint.
- `app/api/push/status/route.ts` — authenticated endpoint to check whether the current endpoint is active.
- `app/api/notifications/route.ts` — authenticated notification list/unread endpoint.
- `app/api/notifications/read/route.ts` — authenticated mark-read endpoint.
- `components/notifications/use-push-subscription.ts` — client hook for browser permission, subscribe, and status checks.
- `components/notifications/notification-permission-gate.tsx` — mandatory blocking gate.
- `components/notifications/notification-bell.tsx` — bell dropdown with unread badge and list.
- `prisma/migrations/20260629120000_add_notifications/migration.sql` — migration for enums, tables, indexes.

Modify:

- `package.json`
- `package-lock.json`
- `prisma/schema.prisma`
- `public/sw.js`
- `app/dashboard/_components/admin/admin-dashboard-shell.tsx`
- `app/dashboard/_components/admin/admin-site-header-actions.tsx`
- `app/reports/actions/submit.ts`
- `app/reports/actions/resubmit.ts`
- `app/reports/actions/approve-estimation.ts`
- `app/reports/actions/submit-completion-work.ts`
- `app/reports/actions/review-completion.ts`
- `app/reports/actions/approve-final.ts`
- `app/dashboard/pjum/actions.ts`
- `app/reports/pjum/approval-actions.ts`
- intervensi action file that creates report intervention, found during implementation with `rg -n "ADMIN_REALISASI_REVISED|generate-revision|intervensi" app lib`

## Task 1: Dependencies, Schema, and Migration

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260629120000_add_notifications/migration.sql`
- Create: `scripts/generate-vapid-keys.ts`

- [ ] **Step 1: Install Web Push dependencies**

Run:

```bash
npm install web-push
npm install -D @types/web-push
```

Expected:

```text
added ...
```

- [ ] **Step 2: Add Prisma enums and relations**

In `prisma/schema.prisma`, add enums after `ActivityAction`:

```prisma
enum NotificationType {
  REPORT_SUBMITTED
  REPORT_ESTIMATION_APPROVED
  REPORT_ESTIMATION_REJECTED_REVISION
  REPORT_ESTIMATION_REJECTED
  REPORT_WORK_STARTED
  REPORT_COMPLETION_SUBMITTED
  REPORT_WORK_APPROVED
  REPORT_WORK_REJECTED_REVISION
  REPORT_FINAL_APPROVED
  REPORT_FINAL_REJECTED_REVISION
  PJUM_CREATED
  PJUM_APPROVED
  PJUM_REJECTED
  REPORT_INTERVENTION_CREATED
}

enum NotificationEntityType {
  REPORT
  PJUM
  INTERVENTION
}
```

In `model User`, add relations near existing `presence`:

```prisma
  notificationsReceived Notification[]     @relation("ReceivedNotifications")
  notificationsSent     Notification[]     @relation("SentNotifications")
  pushSubscriptions     PushSubscription[]
```

Add models after `UserPresence`:

```prisma
model Notification {
  id            String                 @id @default(uuid())
  recipientNIK  String
  actorNIK      String?
  type          NotificationType
  title         String
  body          String
  href          String
  entityType    NotificationEntityType
  entityId      String
  reportNumber  String?
  pjumExportId  String?
  metadata      Json                   @default("{}")
  readAt        DateTime?
  createdAt     DateTime               @default(now())

  recipient     User                   @relation("ReceivedNotifications", fields: [recipientNIK], references: [NIK])
  actor         User?                  @relation("SentNotifications", fields: [actorNIK], references: [NIK])

  @@index([recipientNIK, readAt, createdAt])
  @@index([recipientNIK, createdAt])
  @@index([entityType, entityId])
  @@index([reportNumber])
  @@index([pjumExportId])
}

model PushSubscription {
  id          String    @id @default(uuid())
  userNIK     String
  endpoint    String    @unique
  p256dh      String
  auth        String
  userAgent   String?
  deviceLabel String?
  disabledAt  DateTime?
  lastUsedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user        User      @relation(fields: [userNIK], references: [NIK])

  @@index([userNIK, disabledAt])
}
```

- [ ] **Step 3: Create migration SQL**

Create `prisma/migrations/20260629120000_add_notifications/migration.sql`:

```sql
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
```

- [ ] **Step 4: Add VAPID generator script**

Create `scripts/generate-vapid-keys.ts`:

```ts
import webPush from "web-push";

const keys = webPush.generateVAPIDKeys();

console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + keys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + keys.privateKey);
console.log("VAPID_SUBJECT=mailto:admin@example.com");
```

- [ ] **Step 5: Generate Prisma client locally**

Run:

```bash
npx prisma generate
```

Expected:

```text
Generated Prisma Client
```

- [ ] **Step 6: Verify schema format**

Run:

```bash
npx prisma validate
```

Expected:

```text
The schema at prisma/schema.prisma is valid
```

- [ ] **Step 7: Commit task 1**

Run:

```bash
git add package.json package-lock.json prisma/schema.prisma prisma/migrations/20260629120000_add_notifications/migration.sql scripts/generate-vapid-keys.ts
git commit -m "feat: add notification schema and web push dependency"
```

## Task 2: Notification Domain and Pure Tests

**Files:**

- Create: `lib/notifications/types.ts`
- Create: `lib/notifications/templates.ts`
- Create: `lib/notifications/recipients.ts`
- Create: `lib/notifications/push.ts`
- Create: `lib/notifications/dispatch.ts`
- Create: `lib/notifications/templates.spec.ts`
- Create: `lib/notifications/recipients.spec.ts`

- [ ] **Step 1: Create shared notification types**

Create `lib/notifications/types.ts`:

```ts
import type { NotificationEntityType, NotificationType, UserRole } from "@prisma/client";

export type NotificationEventInput =
    | {
          type: "REPORT_SUBMITTED" | "REPORT_COMPLETION_SUBMITTED";
          actorNIK: string;
          reportNumber: string;
      }
    | {
          type:
              | "REPORT_ESTIMATION_APPROVED"
              | "REPORT_ESTIMATION_REJECTED_REVISION"
              | "REPORT_ESTIMATION_REJECTED"
              | "REPORT_WORK_APPROVED"
              | "REPORT_WORK_REJECTED_REVISION"
              | "REPORT_FINAL_APPROVED"
              | "REPORT_FINAL_REJECTED_REVISION"
              | "REPORT_INTERVENTION_CREATED";
          actorNIK: string;
          reportNumber: string;
          notes?: string | null;
      }
    | {
          type: "PJUM_CREATED" | "PJUM_APPROVED" | "PJUM_REJECTED";
          actorNIK: string;
          pjumExportId: string;
          notes?: string | null;
      };

export type NotificationTemplateContext = {
    type: NotificationType;
    actorNIK: string;
    recipientRole: UserRole;
    report?: {
        reportNumber: string;
        storeCode: string | null;
        storeName: string;
        branchName: string;
        createdByNIK: string;
    };
    pjum?: {
        id: string;
        bmsNIK: string;
        branchName: string;
        weekNumber: number;
        reportNumbers: string[];
    };
    notes?: string | null;
};

export type NotificationTemplate = {
    type: NotificationType;
    title: string;
    body: string;
    href: string;
    entityType: NotificationEntityType;
    entityId: string;
    reportNumber?: string | null;
    pjumExportId?: string | null;
    metadata: Record<string, string | number | boolean | null>;
};

export type NotificationRecipient = {
    NIK: string;
    role: UserRole;
};

export type PushPayload = {
    notificationId: string;
    title: string;
    body: string;
    href: string;
    type: NotificationType;
};
```

- [ ] **Step 2: Write template tests first**

Create `lib/notifications/templates.spec.ts`:

```ts
import assert from "node:assert/strict";
import { UserRole } from "@prisma/client";
import { buildNotificationTemplate } from "./templates";

const report = {
    reportNumber: "U845-2606-001",
    storeCode: "U845",
    storeName: "KPG. TIMOR RAYA KM10",
    branchName: "SIDOARJO",
    createdByNIK: "24115397",
};

const bmcTemplate = buildNotificationTemplate({
    type: "REPORT_SUBMITTED",
    actorNIK: "24115397",
    recipientRole: UserRole.BMC,
    report,
});

assert.equal(bmcTemplate.href, "/dashboard/reports/U845-2606-001");
assert.equal(bmcTemplate.entityType, "REPORT");
assert.equal(bmcTemplate.entityId, "U845-2606-001");
assert.match(bmcTemplate.title, /menunggu review estimasi/i);

const bmsTemplate = buildNotificationTemplate({
    type: "REPORT_ESTIMATION_APPROVED",
    actorNIK: "BMC001",
    recipientRole: UserRole.BMS,
    report,
});

assert.equal(bmsTemplate.href, "/reports/U845-2606-001");
assert.match(bmsTemplate.body, /boleh mulai pekerjaan/i);

const pjumTemplate = buildNotificationTemplate({
    type: "PJUM_CREATED",
    actorNIK: "BMC001",
    recipientRole: UserRole.BNM_MANAGER,
    pjum: {
        id: "4a3c3d57-5555-4444-9999-111111111111",
        bmsNIK: "24115397",
        branchName: "SIDOARJO",
        weekNumber: 4,
        reportNumbers: ["U845-2606-001", "U845-2606-002"],
    },
});

assert.equal(pjumTemplate.href, "/dashboard/pjum/4a3c3d57-5555-4444-9999-111111111111");
assert.match(pjumTemplate.body, /2 laporan/i);

console.log("notification template tests passed");
```

- [ ] **Step 3: Run template test and confirm failure**

Run:

```bash
npx tsx lib/notifications/templates.spec.ts
```

Expected:

```text
Cannot find module './templates'
```

- [ ] **Step 4: Implement templates**

Create `lib/notifications/templates.ts`:

```ts
import { UserRole } from "@prisma/client";
import type { NotificationTemplate, NotificationTemplateContext } from "./types";

function reportHref(role: UserRole, reportNumber: string) {
    return role === UserRole.BMS
        ? `/reports/${reportNumber}`
        : `/dashboard/reports/${reportNumber}`;
}

function reportLabel(report: NonNullable<NotificationTemplateContext["report"]>) {
    return `${report.reportNumber} - ${report.storeName || report.storeCode || "Toko"}`;
}

export function buildNotificationTemplate(
    context: NotificationTemplateContext,
): NotificationTemplate {
    if (context.report) {
        const report = context.report;
        const href = reportHref(context.recipientRole, report.reportNumber);
        const base = {
            type: context.type,
            href,
            entityType: "REPORT" as const,
            entityId: report.reportNumber,
            reportNumber: report.reportNumber,
            pjumExportId: null,
            metadata: {
                branchName: report.branchName,
                storeCode: report.storeCode,
                actorNIK: context.actorNIK,
            },
        };

        switch (context.type) {
            case "REPORT_SUBMITTED":
                return {
                    ...base,
                    title: "Laporan baru menunggu review estimasi",
                    body: `${reportLabel(report)} perlu dicek oleh BMC.`,
                };
            case "REPORT_ESTIMATION_APPROVED":
                return {
                    ...base,
                    title: "Estimasi disetujui",
                    body: `${reportLabel(report)} sudah disetujui. BMS boleh mulai pekerjaan.`,
                };
            case "REPORT_ESTIMATION_REJECTED_REVISION":
                return {
                    ...base,
                    title: "Estimasi perlu direvisi",
                    body: `${reportLabel(report)} dikembalikan untuk revisi. Buka laporan untuk melihat catatan.`,
                };
            case "REPORT_ESTIMATION_REJECTED":
                return {
                    ...base,
                    title: "Estimasi ditolak",
                    body: `${reportLabel(report)} ditolak permanen oleh BMC.`,
                };
            case "REPORT_COMPLETION_SUBMITTED":
                return {
                    ...base,
                    title: "Penyelesaian menunggu review",
                    body: `${reportLabel(report)} perlu dicek dengan nota dan foto pekerjaan.`,
                };
            case "REPORT_WORK_APPROVED":
                return {
                    ...base,
                    title: "Pekerjaan disetujui BMC",
                    body: `${reportLabel(report)} sudah diteruskan ke BNM untuk approval final.`,
                };
            case "REPORT_WORK_REJECTED_REVISION":
                return {
                    ...base,
                    title: "Pekerjaan perlu direvisi",
                    body: `${reportLabel(report)} dikembalikan oleh BMC. Buka laporan untuk melihat catatan.`,
                };
            case "REPORT_FINAL_APPROVED":
                return {
                    ...base,
                    title: "Laporan selesai final",
                    body: `${reportLabel(report)} sudah disetujui final oleh BNM.`,
                };
            case "REPORT_FINAL_REJECTED_REVISION":
                return {
                    ...base,
                    title: "Approval final dikembalikan",
                    body: `${reportLabel(report)} dikembalikan oleh BNM. Buka laporan untuk melihat catatan.`,
                };
            case "REPORT_INTERVENTION_CREATED":
                return {
                    ...base,
                    title: "Ada intervensi laporan selesai",
                    body: `${reportLabel(report)} mendapat koreksi dari Admin setelah status selesai.`,
                };
        }
    }

    if (context.pjum) {
        const pjum = context.pjum;
        const reportCount = pjum.reportNumbers.length;
        const base = {
            type: context.type,
            href: `/dashboard/pjum/${pjum.id}`,
            entityType: "PJUM" as const,
            entityId: pjum.id,
            reportNumber: null,
            pjumExportId: pjum.id,
            metadata: {
                branchName: pjum.branchName,
                bmsNIK: pjum.bmsNIK,
                weekNumber: pjum.weekNumber,
                actorNIK: context.actorNIK,
            },
        };

        switch (context.type) {
            case "PJUM_CREATED":
                return {
                    ...base,
                    title: "PJUM menunggu approval",
                    body: `PJUM minggu ${pjum.weekNumber} berisi ${reportCount} laporan perlu dicek oleh BNM.`,
                };
            case "PJUM_APPROVED":
                return {
                    ...base,
                    title: "PJUM disetujui",
                    body: `PJUM minggu ${pjum.weekNumber} berisi ${reportCount} laporan sudah disetujui BNM.`,
                };
            case "PJUM_REJECTED":
                return {
                    ...base,
                    title: "PJUM ditolak",
                    body: `PJUM minggu ${pjum.weekNumber} dikembalikan. Buka detail PJUM untuk melihat catatan.`,
                };
        }
    }

    throw new Error(`Unsupported notification template: ${context.type}`);
}
```

- [ ] **Step 5: Write recipient filtering tests**

Create `lib/notifications/recipients.spec.ts`:

```ts
import assert from "node:assert/strict";
import { UserRole } from "@prisma/client";
import { filterUsersByBranchAndRole } from "./recipients";

const users = [
    { NIK: "BMC-SDA", role: UserRole.BMC, branchNames: ["SIDOARJO"], deletedAt: null },
    { NIK: "BMC-MLG", role: UserRole.BMC, branchNames: ["MALANG"], deletedAt: null },
    { NIK: "BNM-SDA", role: UserRole.BNM_MANAGER, branchNames: ["SIDOARJO"], deletedAt: null },
    { NIK: "BMC-DELETED", role: UserRole.BMC, branchNames: ["SIDOARJO"], deletedAt: new Date() },
];

const bmc = filterUsersByBranchAndRole(users, "SIDOARJO", UserRole.BMC);
assert.deepEqual(bmc.map((user) => user.NIK), ["BMC-SDA"]);

const bnm = filterUsersByBranchAndRole(users, "SIDOARJO", UserRole.BNM_MANAGER);
assert.deepEqual(bnm.map((user) => user.NIK), ["BNM-SDA"]);

console.log("notification recipient tests passed");
```

- [ ] **Step 6: Implement recipients**

Create `lib/notifications/recipients.ts`:

```ts
import "server-only";

import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { NotificationRecipient } from "./types";

type BranchUser = {
    NIK: string;
    role: UserRole;
    branchNames: string[];
    deletedAt: Date | null;
};

export function filterUsersByBranchAndRole(
    users: BranchUser[],
    branchName: string,
    role: UserRole,
): NotificationRecipient[] {
    return users
        .filter((user) => user.role === role)
        .filter((user) => user.deletedAt === null)
        .filter((user) => user.branchNames.includes(branchName))
        .map((user) => ({ NIK: user.NIK, role: user.role }));
}

export async function getBmsRecipient(NIK: string): Promise<NotificationRecipient[]> {
    const user = await prisma.user.findUnique({
        where: { NIK },
        select: { NIK: true, role: true, deletedAt: true },
    });

    if (!user || user.deletedAt || user.role !== UserRole.BMS) return [];
    return [{ NIK: user.NIK, role: user.role }];
}

export async function getBranchRecipients(params: {
    branchName: string;
    role: UserRole.BMC | UserRole.BNM_MANAGER;
}): Promise<NotificationRecipient[]> {
    const users = await prisma.user.findMany({
        where: {
            role: params.role,
            branchNames: { has: params.branchName },
            deletedAt: null,
        },
        select: { NIK: true, role: true },
    });

    return users.map((user) => ({ NIK: user.NIK, role: user.role }));
}
```

- [ ] **Step 7: Implement push delivery**

Create `lib/notifications/push.ts`:

```ts
import "server-only";

import webPush from "web-push";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { PushPayload } from "./types";

let configured = false;

function configureWebPush() {
    if (configured) return true;

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) return false;

    webPush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
    return true;
}

export async function sendPushToRecipients(params: {
    recipientNIKs: string[];
    payload: PushPayload;
}) {
    if (!configureWebPush()) {
        logger.warn(
            { operation: "sendPushToRecipients" },
            "Web Push skipped because VAPID env is not configured",
        );
        return;
    }

    const subscriptions = await prisma.pushSubscription.findMany({
        where: {
            userNIK: { in: params.recipientNIKs },
            disabledAt: null,
        },
        select: {
            id: true,
            endpoint: true,
            p256dh: true,
            auth: true,
        },
    });

    await Promise.all(
        subscriptions.map(async (subscription) => {
            try {
                await webPush.sendNotification(
                    {
                        endpoint: subscription.endpoint,
                        keys: {
                            p256dh: subscription.p256dh,
                            auth: subscription.auth,
                        },
                    },
                    JSON.stringify(params.payload),
                );

                await prisma.pushSubscription.update({
                    where: { id: subscription.id },
                    data: { lastUsedAt: new Date() },
                });
            } catch (error) {
                const statusCode =
                    typeof error === "object" && error && "statusCode" in error
                        ? Number((error as { statusCode?: number }).statusCode)
                        : null;

                if (statusCode === 404 || statusCode === 410) {
                    await prisma.pushSubscription.update({
                        where: { id: subscription.id },
                        data: { disabledAt: new Date() },
                    });
                    return;
                }

                logger.warn(
                    { operation: "sendPushToRecipients", subscriptionId: subscription.id },
                    "Web Push delivery failed",
                    error instanceof Error ? error : new Error(String(error)),
                );
            }
        }),
    );
}
```

- [ ] **Step 8: Implement dispatch**

Create `lib/notifications/dispatch.ts`:

```ts
import "server-only";

import { NotificationType, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { buildNotificationTemplate } from "./templates";
import { getBmsRecipient, getBranchRecipients } from "./recipients";
import { sendPushToRecipients } from "./push";
import type { NotificationEventInput, NotificationRecipient } from "./types";

export async function dispatchNotificationEvent(input: NotificationEventInput) {
    try {
        if ("reportNumber" in input) {
            await dispatchReportNotification(input);
            return;
        }

        await dispatchPjumNotification(input);
    } catch (error) {
        logger.warn(
            { operation: "dispatchNotificationEvent", type: input.type },
            "Notification dispatch failed",
            error instanceof Error ? error : new Error(String(error)),
        );
    }
}

async function dispatchReportNotification(
    input: Extract<NotificationEventInput, { reportNumber: string }>,
) {
    const report = await prisma.report.findUnique({
        where: { reportNumber: input.reportNumber },
        select: {
            reportNumber: true,
            storeCode: true,
            storeName: true,
            branchName: true,
            createdByNIK: true,
        },
    });

    if (!report) return;

    const recipients = await getReportRecipients(input.type, report);
    await createAndPushNotifications({
        type: input.type,
        actorNIK: input.actorNIK,
        recipients,
        report,
        notes: input.notes,
    });
}

async function dispatchPjumNotification(
    input: Extract<NotificationEventInput, { pjumExportId: string }>,
) {
    const pjum = await prisma.pjumExport.findUnique({
        where: { id: input.pjumExportId },
        select: {
            id: true,
            bmsNIK: true,
            branchName: true,
            weekNumber: true,
            reportNumbers: true,
            createdByNIK: true,
        },
    });

    if (!pjum) return;

    const recipients = await getPjumRecipients(input.type, pjum);
    await createAndPushNotifications({
        type: input.type,
        actorNIK: input.actorNIK,
        recipients,
        pjum,
        notes: input.notes,
    });
}

async function getReportRecipients(
    type: NotificationType,
    report: { branchName: string; createdByNIK: string },
): Promise<NotificationRecipient[]> {
    switch (type) {
        case "REPORT_SUBMITTED":
        case "REPORT_COMPLETION_SUBMITTED":
            return getBranchRecipients({ branchName: report.branchName, role: UserRole.BMC });
        case "REPORT_WORK_APPROVED":
            return getBranchRecipients({ branchName: report.branchName, role: UserRole.BNM_MANAGER });
        case "REPORT_FINAL_APPROVED":
        case "REPORT_FINAL_REJECTED_REVISION": {
            const [bms, bmc] = await Promise.all([
                getBmsRecipient(report.createdByNIK),
                getBranchRecipients({ branchName: report.branchName, role: UserRole.BMC }),
            ]);
            return [...bms, ...bmc];
        }
        case "REPORT_INTERVENTION_CREATED": {
            const [bms, bmc, bnm] = await Promise.all([
                getBmsRecipient(report.createdByNIK),
                getBranchRecipients({ branchName: report.branchName, role: UserRole.BMC }),
                getBranchRecipients({ branchName: report.branchName, role: UserRole.BNM_MANAGER }),
            ]);
            return [...bms, ...bmc, ...bnm];
        }
        default:
            return getBmsRecipient(report.createdByNIK);
    }
}

async function getPjumRecipients(
    type: NotificationType,
    pjum: { bmsNIK: string; branchName: string; createdByNIK: string },
): Promise<NotificationRecipient[]> {
    if (type === "PJUM_CREATED") {
        return getBranchRecipients({ branchName: pjum.branchName, role: UserRole.BNM_MANAGER });
    }

    const [bms, creator] = await Promise.all([
        getBmsRecipient(pjum.bmsNIK),
        prisma.user.findUnique({
            where: { NIK: pjum.createdByNIK },
            select: { NIK: true, role: true, deletedAt: true },
        }),
    ]);

    const recipients = [...bms];
    if (creator && !creator.deletedAt) {
        recipients.push({ NIK: creator.NIK, role: creator.role });
    }
    return recipients;
}

async function createAndPushNotifications(params: {
    type: NotificationType;
    actorNIK: string;
    recipients: NotificationRecipient[];
    report?: {
        reportNumber: string;
        storeCode: string | null;
        storeName: string;
        branchName: string;
        createdByNIK: string;
    };
    pjum?: {
        id: string;
        bmsNIK: string;
        branchName: string;
        weekNumber: number;
        reportNumbers: string[];
    };
    notes?: string | null;
}) {
    const uniqueRecipients = Array.from(
        new Map(params.recipients.map((recipient) => [recipient.NIK, recipient])).values(),
    ).filter((recipient) => recipient.NIK !== params.actorNIK);

    await Promise.all(
        uniqueRecipients.map(async (recipient) => {
            const template = buildNotificationTemplate({
                type: params.type,
                actorNIK: params.actorNIK,
                recipientRole: recipient.role,
                report: params.report,
                pjum: params.pjum,
                notes: params.notes,
            });

            const notification = await prisma.notification.create({
                data: {
                    recipientNIK: recipient.NIK,
                    actorNIK: params.actorNIK,
                    type: template.type,
                    title: template.title,
                    body: template.body,
                    href: template.href,
                    entityType: template.entityType,
                    entityId: template.entityId,
                    reportNumber: template.reportNumber,
                    pjumExportId: template.pjumExportId,
                    metadata: template.metadata,
                },
                select: { id: true, title: true, body: true, href: true, type: true },
            });

            await sendPushToRecipients({
                recipientNIKs: [recipient.NIK],
                payload: {
                    notificationId: notification.id,
                    title: notification.title,
                    body: notification.body,
                    href: notification.href,
                    type: notification.type,
                },
            });
        }),
    );
}
```

- [ ] **Step 9: Run pure tests**

Run:

```bash
npx tsx lib/notifications/templates.spec.ts
npx tsx lib/notifications/recipients.spec.ts
```

Expected:

```text
notification template tests passed
notification recipient tests passed
```

- [ ] **Step 10: Commit task 2**

Run:

```bash
git add lib/notifications
git commit -m "feat: add notification domain dispatch"
```

## Task 3: Push Subscription API and Notification API

**Files:**

- Create: `lib/web-push/client.ts`
- Create: `app/api/push/subscribe/route.ts`
- Create: `app/api/push/unsubscribe/route.ts`
- Create: `app/api/push/status/route.ts`
- Create: `app/api/notifications/route.ts`
- Create: `app/api/notifications/read/route.ts`

- [ ] **Step 1: Create client helper**

Create `lib/web-push/client.ts`:

```ts
export function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function isWebPushSupported() {
    return (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window &&
        Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
    );
}

export async function getServiceWorkerRegistration() {
    if (!("serviceWorker" in navigator)) return null;
    return navigator.serviceWorker.ready;
}
```

- [ ] **Step 2: Create subscribe route**

Create `app/api/push/subscribe/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/authorization";

const subscriptionSchema = z.object({
    endpoint: z.string().url(),
    keys: z.object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
    }),
});

export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = subscriptionSchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const userAgent = request.headers.get("user-agent");

    await prisma.pushSubscription.upsert({
        where: { endpoint: parsed.data.endpoint },
        update: {
            userNIK: user.NIK,
            p256dh: parsed.data.keys.p256dh,
            auth: parsed.data.keys.auth,
            userAgent,
            disabledAt: null,
            lastUsedAt: new Date(),
        },
        create: {
            userNIK: user.NIK,
            endpoint: parsed.data.endpoint,
            p256dh: parsed.data.keys.p256dh,
            auth: parsed.data.keys.auth,
            userAgent,
            lastUsedAt: new Date(),
        },
    });

    return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create unsubscribe route**

Create `app/api/push/unsubscribe/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/authorization";

const schema = z.object({ endpoint: z.string().url() });

export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
    }

    await prisma.pushSubscription.updateMany({
        where: {
            endpoint: parsed.data.endpoint,
            userNIK: user.NIK,
            disabledAt: null,
        },
        data: { disabledAt: new Date() },
    });

    return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Create status route**

Create `app/api/push/status/route.ts`:

```ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/authorization";

export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
    const endpoint = body?.endpoint;

    if (!endpoint) {
        return NextResponse.json({ active: false });
    }

    const subscription = await prisma.pushSubscription.findFirst({
        where: {
            endpoint,
            userNIK: user.NIK,
            disabledAt: null,
        },
        select: { id: true },
    });

    return NextResponse.json({ active: Boolean(subscription) });
}
```

- [ ] **Step 5: Create notification list route**

Create `app/api/notifications/route.ts`:

```ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/authorization";

export async function GET() {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [items, unreadCount] = await Promise.all([
        prisma.notification.findMany({
            where: { recipientNIK: user.NIK },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
                id: true,
                type: true,
                title: true,
                body: true,
                href: true,
                readAt: true,
                createdAt: true,
            },
        }),
        prisma.notification.count({
            where: { recipientNIK: user.NIK, readAt: null },
        }),
    ]);

    return NextResponse.json({
        items: items.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            readAt: item.readAt?.toISOString() ?? null,
        })),
        unreadCount,
    });
}
```

- [ ] **Step 6: Create mark read route**

Create `app/api/notifications/read/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/authorization";

const schema = z.object({
    id: z.string().uuid().optional(),
    all: z.boolean().optional(),
});

export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const now = new Date();

    if (parsed.data.all) {
        await prisma.notification.updateMany({
            where: { recipientNIK: user.NIK, readAt: null },
            data: { readAt: now },
        });
        return NextResponse.json({ ok: true });
    }

    if (parsed.data.id) {
        await prisma.notification.updateMany({
            where: { id: parsed.data.id, recipientNIK: user.NIK },
            data: { readAt: now },
        });
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "No notification selected" }, { status: 400 });
}
```

- [ ] **Step 7: Run type check for new API**

Run:

```bash
npx tsc --noEmit
```

Expected:

```text
no output
```

- [ ] **Step 8: Commit task 3**

Run:

```bash
git add lib/web-push app/api/push app/api/notifications
git commit -m "feat: add notification and push APIs"
```

## Task 4: Service Worker Push Handling

**Files:**

- Modify: `public/sw.js`

- [ ] **Step 1: Update service worker**

Append push handlers while preserving existing install/activate/fetch code in `public/sw.js`:

```js
self.addEventListener("push", (event) => {
    let payload = {
        title: "SPARTA Maintenance",
        body: "Ada notifikasi baru.",
        href: "/dashboard",
        notificationId: null,
        type: null,
    };

    if (event.data) {
        try {
            payload = { ...payload, ...event.data.json() };
        } catch {
            payload.body = event.data.text();
        }
    }

    const options = {
        body: payload.body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        data: {
            href: payload.href || "/dashboard",
            notificationId: payload.notificationId,
            type: payload.type,
        },
    };

    event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const href = event.notification.data?.href || "/dashboard";
    const targetUrl = new URL(href, self.location.origin).href;

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clients) => {
                const existing = clients.find((client) => client.url === targetUrl);
                if (existing) return existing.focus();
                return self.clients.openWindow(targetUrl);
            }),
    );
});
```

- [ ] **Step 2: Verify no service worker syntax errors**

Run:

```bash
node --check public/sw.js
```

Expected:

```text
no output
```

- [ ] **Step 3: Commit task 4**

Run:

```bash
git add public/sw.js
git commit -m "feat: handle web push in service worker"
```

## Task 5: Client UI, Bell Dropdown, and Mandatory Gate

**Files:**

- Create: `components/notifications/use-push-subscription.ts`
- Create: `components/notifications/notification-permission-gate.tsx`
- Create: `components/notifications/notification-bell.tsx`
- Modify: `app/dashboard/_components/admin/admin-dashboard-shell.tsx`
- Modify: `app/dashboard/_components/admin/admin-site-header-actions.tsx`

- [ ] **Step 1: Create push subscription hook**

Create `components/notifications/use-push-subscription.ts`:

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import {
    getServiceWorkerRegistration,
    isWebPushSupported,
    urlBase64ToUint8Array,
} from "@/lib/web-push/client";

export type PushPermissionState =
    | "checking"
    | "unsupported"
    | "default"
    | "granted"
    | "denied"
    | "active"
    | "error";

export function usePushSubscription() {
    const [state, setState] = useState<PushPermissionState>("checking");
    const [isBusy, setIsBusy] = useState(false);

    const getSubscription = useCallback(async () => {
        const registration = await getServiceWorkerRegistration();
        if (!registration) return null;
        return registration.pushManager.getSubscription();
    }, []);

    const refresh = useCallback(async () => {
        if (!isWebPushSupported()) {
            setState("unsupported");
            return;
        }

        if (Notification.permission === "denied") {
            setState("denied");
            return;
        }

        const subscription = await getSubscription();
        if (!subscription) {
            setState(Notification.permission === "granted" ? "granted" : "default");
            return;
        }

        const response = await fetch("/api/push/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        const data = (await response.json()) as { active?: boolean };
        setState(data.active ? "active" : "granted");
    }, [getSubscription]);

    const subscribe = useCallback(async () => {
        if (!isWebPushSupported()) {
            setState("unsupported");
            return;
        }

        setIsBusy(true);
        try {
            const permission =
                Notification.permission === "default"
                    ? await Notification.requestPermission()
                    : Notification.permission;

            if (permission === "denied") {
                setState("denied");
                return;
            }

            const registration = await getServiceWorkerRegistration();
            const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!registration || !publicKey) {
                setState("unsupported");
                return;
            }

            const existing = await registration.pushManager.getSubscription();
            const subscription =
                existing ??
                (await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey),
                }));

            await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription.toJSON()),
            });

            setState("active");
        } catch {
            setState("error");
        } finally {
            setIsBusy(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { state, isBusy, refresh, subscribe };
}
```

- [ ] **Step 2: Create mandatory gate**

Create `components/notifications/notification-permission-gate.tsx`:

```tsx
"use client";

import { BellRing, LogOut, RefreshCw } from "lucide-react";
import { logoutAction } from "@/app/dashboard/action";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "./use-push-subscription";

const REQUIRED_ROLES = new Set(["BMS", "BMC", "BNM_MANAGER", "ADMIN"]);

export function NotificationPermissionGate({ role }: { role: string }) {
    const { state, isBusy, refresh, subscribe } = usePushSubscription();

    const enabled =
        process.env.NEXT_PUBLIC_NOTIFICATIONS_ENABLED !== "false" &&
        process.env.NEXT_PUBLIC_WEB_PUSH_ENABLED !== "false" &&
        process.env.NEXT_PUBLIC_NOTIFICATION_GATE_REQUIRED === "true";

    if (!enabled || !REQUIRED_ROLES.has(role)) return null;
    if (state === "checking" || state === "unsupported" || state === "active") {
        return null;
    }

    const denied = state === "denied";

    return (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg">
                <Alert className="border-amber-200 bg-amber-50 text-amber-950">
                    <BellRing className="size-4" />
                    <AlertTitle>Aktifkan notifikasi untuk melanjutkan</AlertTitle>
                    <AlertDescription>
                        SPARTA memakai notifikasi untuk approval laporan, revisi,
                        dan PJUM. Anda wajib mengaktifkan notifikasi agar tidak
                        melewatkan proses bisnis.
                    </AlertDescription>
                </Alert>
                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    {denied ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={refresh}
                            disabled={isBusy}
                        >
                            <RefreshCw data-icon="inline-start" />
                            Cek ulang izin
                        </Button>
                    ) : (
                        <Button type="button" onClick={subscribe} disabled={isBusy}>
                            <BellRing data-icon="inline-start" />
                            {isBusy ? "Mengaktifkan..." : "Aktifkan notifikasi"}
                        </Button>
                    )}
                    <form action={logoutAction}>
                        <Button type="submit" variant="ghost">
                            <LogOut data-icon="inline-start" />
                            Logout
                        </Button>
                    </form>
                </div>
                {denied ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                        Izin notifikasi sedang diblokir oleh browser. Aktifkan izin
                        dari pengaturan browser/site settings, lalu klik Cek ulang izin.
                    </p>
                ) : null}
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Create notification bell**

Create `components/notifications/notification-bell.tsx`:

```tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePushSubscription } from "./use-push-subscription";

type NotificationItem = {
    id: string;
    title: string;
    body: string;
    href: string;
    readAt: string | null;
    createdAt: string;
};

export function NotificationBell() {
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isPending, startTransition] = useTransition();
    const push = usePushSubscription();

    const load = async () => {
        const response = await fetch("/api/notifications");
        if (!response.ok) return;
        const data = (await response.json()) as {
            items: NotificationItem[];
            unreadCount: number;
        };
        setItems(data.items);
        setUnreadCount(data.unreadCount);
    };

    useEffect(() => {
        load();
    }, []);

    const markRead = (id?: string) => {
        startTransition(async () => {
            await fetch("/api/notifications/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(id ? { id } : { all: true }),
            });
            await load();
        });
    };

    return (
        <DropdownMenu onOpenChange={(open) => open && load()}>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="relative rounded-full"
                    aria-label="Notifikasi"
                >
                    <Bell />
                    {unreadCount > 0 ? (
                        <Badge className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px]">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    ) : null}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifikasi</span>
                    {unreadCount > 0 ? (
                        <button
                            type="button"
                            className="text-xs text-primary"
                            disabled={isPending}
                            onClick={() => markRead()}
                        >
                            Tandai semua dibaca
                        </button>
                    ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem disabled>
                        {push.state === "active"
                            ? "Perangkat aktif menerima notifikasi"
                            : push.state === "unsupported"
                              ? "Notifikasi perangkat tidak didukung"
                              : "Notifikasi wajib diaktifkan"}
                    </DropdownMenuItem>
                    {push.state !== "active" && push.state !== "unsupported" ? (
                        <DropdownMenuItem
                            onSelect={(event) => {
                                event.preventDefault();
                                push.subscribe();
                            }}
                        >
                            Aktifkan notifikasi perangkat
                        </DropdownMenuItem>
                    ) : null}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {items.length === 0 ? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyTitle>Belum ada notifikasi</EmptyTitle>
                            <EmptyDescription>
                                Notifikasi proses bisnis akan muncul di sini.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <ScrollArea className="max-h-80">
                        {items.map((item) => (
                            <DropdownMenuItem key={item.id} asChild>
                                <Link
                                    href={item.href}
                                    className="flex flex-col items-start"
                                    onClick={() => markRead(item.id)}
                                >
                                    <span className="font-medium">{item.title}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {item.body}
                                    </span>
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </ScrollArea>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
```

- [ ] **Step 4: Integrate gate in dashboard shell**

Modify `app/dashboard/_components/admin/admin-dashboard-shell.tsx`:

```tsx
import { NotificationPermissionGate } from "@/components/notifications/notification-permission-gate";
```

Render inside `SidebarInset`, after `SiteHeader`:

```tsx
<NotificationPermissionGate role={user.role} />
```

- [ ] **Step 5: Replace notification placeholder**

In `app/dashboard/_components/admin/admin-site-header-actions.tsx`:

Remove `Bell` import and the manual notification `DropdownMenu`. Import:

```tsx
import { NotificationBell } from "@/components/notifications/notification-bell";
```

Render:

```tsx
<NotificationBell />
```

Keep profile dropdown unchanged.

- [ ] **Step 6: Run lint/type check**

Run:

```bash
npx tsc --noEmit
npx eslint components/notifications app/dashboard/_components/admin/admin-dashboard-shell.tsx app/dashboard/_components/admin/admin-site-header-actions.tsx
```

Expected:

```text
no TypeScript errors
```

- [ ] **Step 7: Commit task 5**

Run:

```bash
git add components/notifications app/dashboard/_components/admin/admin-dashboard-shell.tsx app/dashboard/_components/admin/admin-site-header-actions.tsx
git commit -m "feat: add notification bell and permission gate"
```

## Task 6: Business Workflow Integration

**Files:**

- Modify: `app/reports/actions/submit.ts`
- Modify: `app/reports/actions/resubmit.ts`
- Modify: `app/reports/actions/approve-estimation.ts`
- Modify: `app/reports/actions/submit-completion-work.ts`
- Modify: `app/reports/actions/review-completion.ts`
- Modify: `app/reports/actions/approve-final.ts`
- Modify: `app/dashboard/pjum/actions.ts`
- Modify: `app/reports/pjum/approval-actions.ts`
- Modify: intervensi action file found with `rg -n "ADMIN_REALISASI_REVISED|revisedPdf|intervensi" app lib`

- [ ] **Step 1: Add dispatch import to report actions**

In each report action file, add:

```ts
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
```

- [ ] **Step 2: Dispatch BMS submit notification**

In `app/reports/actions/submit.ts`, after successful transaction and before return:

```ts
dispatchNotificationEvent({
    type: "REPORT_SUBMITTED",
    actorNIK: user.NIK,
    reportNumber: reportId,
});
```

- [ ] **Step 3: Dispatch BMS resubmit notification**

In `app/reports/actions/resubmit.ts`, after transaction:

```ts
dispatchNotificationEvent({
    type:
        newStatus === "PENDING_REVIEW"
            ? "REPORT_COMPLETION_SUBMITTED"
            : "REPORT_SUBMITTED",
    actorNIK: user.NIK,
    reportNumber,
});
```

- [ ] **Step 4: Dispatch BMC estimation review notifications**

In `app/reports/actions/approve-estimation.ts`, after transaction:

```ts
const notificationType =
    decision === "approve"
        ? "REPORT_ESTIMATION_APPROVED"
        : decision === "reject_revision"
          ? "REPORT_ESTIMATION_REJECTED_REVISION"
          : "REPORT_ESTIMATION_REJECTED";

dispatchNotificationEvent({
    type: notificationType,
    actorNIK: user.NIK,
    reportNumber,
    notes: logNote,
});

if (isRekananBypass) {
    dispatchNotificationEvent({
        type: "REPORT_WORK_APPROVED",
        actorNIK: user.NIK,
        reportNumber,
        notes: logNote,
    });
}
```

- [ ] **Step 5: Dispatch completion submit notification**

In `app/reports/actions/submit-completion-work.ts`, after transaction:

```ts
dispatchNotificationEvent({
    type: "REPORT_COMPLETION_SUBMITTED",
    actorNIK: user.NIK,
    reportNumber,
    notes,
});
```

- [ ] **Step 6: Dispatch BMC completion review notifications**

In `app/reports/actions/review-completion.ts`, after transaction:

```ts
dispatchNotificationEvent({
    type: decision === "approve" ? "REPORT_WORK_APPROVED" : "REPORT_WORK_REJECTED_REVISION",
    actorNIK: user.NIK,
    reportNumber,
    notes: logNote,
});
```

- [ ] **Step 7: Dispatch BNM final review notifications**

In `app/reports/actions/approve-final.ts`, after transaction and before PDF snapshot:

```ts
dispatchNotificationEvent({
    type: decision === "approve" ? "REPORT_FINAL_APPROVED" : "REPORT_FINAL_REJECTED_REVISION",
    actorNIK: user.NIK,
    reportNumber,
    notes: logNote,
});
```

- [ ] **Step 8: Dispatch PJUM created notification**

In `app/dashboard/pjum/actions.ts`, after `pjumExport` is created and before return:

```ts
dispatchNotificationEvent({
    type: "PJUM_CREATED",
    actorNIK: user.NIK,
    pjumExportId: pjumExport.id,
});
```

- [ ] **Step 9: Dispatch PJUM approved notification**

In `app/reports/pjum/approval-actions.ts`, after `pjumExport` status update succeeds:

```ts
dispatchNotificationEvent({
    type: "PJUM_APPROVED",
    actorNIK: user.NIK,
    pjumExportId: pjumExport.id,
});
```

- [ ] **Step 10: Dispatch PJUM rejected notification**

Find reject action:

```bash
rg -n "REJECTED|rejectionNotes|reject" app/reports/pjum app/dashboard/pjum -g "*.ts"
```

After PJUM status changes to `REJECTED`, add:

```ts
dispatchNotificationEvent({
    type: "PJUM_REJECTED",
    actorNIK: user.NIK,
    pjumExportId,
    notes,
});
```

Use the local variable names from the reject action. If the action uses `validated.pjumExportId`, pass that variable.

- [ ] **Step 11: Dispatch intervensi notification**

Find the admin intervensi mutation:

```bash
rg -n "ADMIN_REALISASI_REVISED|revisedPdfDriveUrl|generate-revision-pdf|intervensi" app lib
```

After successful mutation/PDF generation:

```ts
dispatchNotificationEvent({
    type: "REPORT_INTERVENTION_CREATED",
    actorNIK: user.NIK,
    reportNumber,
});
```

- [ ] **Step 12: Verify imports and types**

Run:

```bash
npx tsc --noEmit
```

Expected:

```text
no output
```

- [ ] **Step 13: Commit task 6**

Run:

```bash
git add app/reports app/dashboard/pjum app/dashboard/reports lib/notifications
git commit -m "feat: dispatch business notifications"
```

## Task 7: Environment Docs and Rollout Guard

**Files:**

- Modify: `.env.example` if present, otherwise create `.env.notification.example`
- Modify: `README.md`
- Modify: `AI_CONTEXT.md`

- [ ] **Step 1: Add env example**

If `.env.example` exists, append:

```env
NEXT_PUBLIC_NOTIFICATIONS_ENABLED=true
NEXT_PUBLIC_WEB_PUSH_ENABLED=true
NEXT_PUBLIC_NOTIFICATION_GATE_REQUIRED=false
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com
```

If `.env.example` does not exist, create `.env.notification.example` with the same content.

- [ ] **Step 2: Add README section**

In `README.md`, add:

```md
### Native Notifications

SPARTA Maintenance uses persistent in-app notifications and optional PWA Web Push delivery.

Generate VAPID keys:

```bash
npx tsx scripts/generate-vapid-keys.ts
```

Required production env:

- `NEXT_PUBLIC_NOTIFICATIONS_ENABLED=true`
- `NEXT_PUBLIC_WEB_PUSH_ENABLED=true`
- `NEXT_PUBLIC_NOTIFICATION_GATE_REQUIRED=true` after push is verified
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Do not enable `NEXT_PUBLIC_NOTIFICATION_GATE_REQUIRED=true` until service worker registration and Web Push delivery have been verified on production.
```

- [ ] **Step 3: Update AI context**

In `AI_CONTEXT.md`, add:

```md
## Notifications

- Business notifications are stored in `Notification`.
- Device push subscriptions are stored in `PushSubscription`.
- Web Push delivery uses `web-push` and `public/sw.js`.
- The authenticated dashboard shell owns the mandatory notification gate.
- Business actions should call `dispatchNotificationEvent` after successful transactions, not inside Prisma transactions.
- Keep notification dispatch non-fatal for report and PJUM workflows.
```

- [ ] **Step 4: Commit task 7**

Run:

```bash
git add README.md AI_CONTEXT.md .env.example .env.notification.example scripts/generate-vapid-keys.ts
git commit -m "docs: document notification rollout"
```

## Task 8: Final Verification

**Files:**

- All files changed in previous tasks.

- [ ] **Step 1: Run pure tests**

Run:

```bash
npx tsx lib/notifications/templates.spec.ts
npx tsx lib/notifications/recipients.spec.ts
```

Expected:

```text
notification template tests passed
notification recipient tests passed
```

- [ ] **Step 2: Run Prisma validation**

Run:

```bash
npx prisma validate
```

Expected:

```text
The schema at prisma/schema.prisma is valid
```

- [ ] **Step 3: Run TypeScript**

Run:

```bash
npx tsc --noEmit
```

Expected:

```text
no output
```

- [ ] **Step 4: Run lint**

Run:

```bash
npx eslint lib/notifications components/notifications app/api/push app/api/notifications app/dashboard/_components/admin app/reports/actions app/dashboard/pjum app/reports/pjum
```

Expected:

```text
no errors
```

- [ ] **Step 5: Run production build**

Run:

```bash
npm run build
```

Expected:

```text
Compiled successfully
```

- [ ] **Step 6: Manual QA with local production-like env**

Run VAPID generation:

```bash
npx tsx scripts/generate-vapid-keys.ts
```

Set local env values. Then run:

```bash
npm run dev
```

Manual checks:

- Login as BMS.
- Confirm mandatory gate appears when `NEXT_PUBLIC_NOTIFICATION_GATE_REQUIRED=true`.
- Click `Aktifkan notifikasi`.
- Allow browser permission.
- Confirm gate disappears.
- Login as BMC in another browser profile.
- Submit report as BMS.
- Confirm BMC bell unread count increases.
- Confirm OS/browser notification appears if dev browser allows service worker push.
- Click notification and confirm it opens `/dashboard/reports/[reportNumber]`.

- [ ] **Step 7: Commit verification fixes**

If verification required fixes:

```bash
git add <changed-files>
git commit -m "fix: harden notification rollout"
```

If no fixes were required, do not create an empty commit.

## Self-Review

- Spec coverage: covered schema, push subscription, service worker, UI gate, bell dropdown, business workflow events, rollout, and verification.
- Placeholder scan: no placeholder task remains; every task contains concrete files and commands.
- Type consistency: event names match `NotificationType`; routes use current authenticated user rather than client-sent user IDs.
- Scope check: first version intentionally excludes realtime websocket, per-event preferences, broad email fallback, and outbox worker.
- Branch safety: plan explicitly uses `codex/native-notifications-spec` and does not instruct committing to `main`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-29-native-notifications.md`. Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints.

Choose an execution mode before implementing.
