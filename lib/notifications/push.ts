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

function getStatusCode(error: unknown) {
    return typeof error === "object" && error && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : null;
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

export async function sendPushToRecipients(params: {
    recipientNIKs: string[];
    payload: PushPayload;
}) {
    try {
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

        for (const subscription of subscriptions) {
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
                const statusCode = getStatusCode(error);

                if (statusCode === 404 || statusCode === 410) {
                    await prisma.pushSubscription.update({
                        where: { id: subscription.id },
                        data: { disabledAt: new Date() },
                    });
                    continue;
                }

                logger.warn(
                    {
                        operation: "sendPushToRecipients",
                        subscriptionId: subscription.id,
                        errorMessage: getErrorMessage(error),
                    },
                    "Web Push delivery failed",
                );
            }
        }
    } catch (error) {
        logger.warn(
            {
                operation: "sendPushToRecipients",
                errorMessage: getErrorMessage(error),
            },
            "Web Push dispatch failed",
        );
    }
}
