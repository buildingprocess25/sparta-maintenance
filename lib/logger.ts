type LogLevel = "info" | "warn" | "error";

type LogContext = {
    operation: string;
    correlationId?: string;
    userId?: string;
    durationMs?: number;
    [key: string]: unknown;
};

function createCorrelationId(): string {
    const cryptoRef = globalThis.crypto as
        | { randomUUID?: () => string }
        | undefined;

    if (cryptoRef?.randomUUID) {
        return cryptoRef.randomUUID();
    }

    return `cid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatLog(level: LogLevel, ctx: LogContext, message: string) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        operation: ctx.operation,
        correlationId: ctx.correlationId ?? createCorrelationId(),
        ...(ctx.userId && { userId: ctx.userId }),
        ...(ctx.durationMs !== undefined && { durationMs: ctx.durationMs }),
        ...Object.fromEntries(
            Object.entries(ctx).filter(
                ([k]) =>
                    ![
                        "operation",
                        "correlationId",
                        "userId",
                        "durationMs",
                    ].includes(k),
            ),
        ),
    };

    const out = JSON.stringify(entry);

    switch (level) {
        case "error":
            console.error(out);
            break;
        case "warn":
            console.warn(out);
            break;
        default:
            console.log(out);
    }
}

export const logger = {
    info: (ctx: LogContext, message: string) => formatLog("info", ctx, message),
    warn: (ctx: LogContext, message: string) => formatLog("warn", ctx, message),
    error: (ctx: LogContext, message: string, error?: unknown) => {
        const extra: Record<string, unknown> = {};
        if (error instanceof Error) {
            extra.errorName = error.name;
            extra.errorMessage = error.message;
            extra.stack = error.stack;
        } else if (error !== undefined) {
            extra.errorRaw = String(error);
        }
        formatLog("error", { ...ctx, ...extra }, message);
    },
};

/**
 * Wrap an async operation with automatic start/success/failure logging.
 */
export async function withLogging<T>(
    ctx: LogContext,
    fn: () => Promise<T>,
): Promise<T> {
    const correlationId = ctx.correlationId ?? createCorrelationId();
    const start = performance.now();

    logger.info({ ...ctx, correlationId }, `${ctx.operation} started`);

    try {
        const result = await fn();
        const durationMs = Math.round(performance.now() - start);
        logger.info(
            { ...ctx, correlationId, durationMs },
            `${ctx.operation} completed`,
        );
        return result;
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        logger.error(
            { ...ctx, correlationId, durationMs },
            `${ctx.operation} failed`,
            error,
        );
        throw error;
    }
}
