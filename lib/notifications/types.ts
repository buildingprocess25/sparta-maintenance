import type {
    NotificationEntityType,
    NotificationType,
    UserRole,
} from "@prisma/client";

export type NotificationEventInput =
    | {
          type:
              | "REPORT_SUBMITTED"
              | "REPORT_WORK_STARTED"
              | "REPORT_COMPLETION_SUBMITTED";
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
