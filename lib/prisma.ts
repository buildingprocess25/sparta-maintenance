import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ quiet: true });

function parsePositiveInteger(value: string | undefined, fallback: number) {
    if (!value) return fallback;

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const prismaClientSingleton = () => {
    // Use DATABASE_URL for runtime.
    // DIRECT_URL is for migrations only (bypasses pooler, hits DB directly).
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error("DATABASE_URL environment variable is not set");
    }

    // Strip ?sslmode=require so it doesn't override our manual ssl config
    const cleanDatabaseUrl = databaseUrl.replace("?sslmode=require", "");

    const isDevelopment = process.env.NODE_ENV === "development";
    const defaultPoolMax = 3;
    const poolMax = parsePositiveInteger(
        process.env.DATABASE_POOL_MAX,
        defaultPoolMax,
    );
    const idleTimeoutMillis = parsePositiveInteger(
        process.env.DATABASE_IDLE_TIMEOUT_MS,
        isDevelopment ? 2000 : 10000,
    );
    const connectionTimeoutMillis = parsePositiveInteger(
        process.env.DATABASE_CONNECTION_TIMEOUT_MS,
        10000,
    );

    // Keep the pool small, but not single-connection: dashboard queries run in
    // parallel and will timeout while queued behind one busy connection.
    const pool = new Pool({
        connectionString: cleanDatabaseUrl,
        max: poolMax,
        idleTimeoutMillis,
        connectionTimeoutMillis,
        allowExitOnIdle: true,
        options: "-c timezone=UTC",
        ssl: { rejectUnauthorized: false }, // Required for Aiven PG without specific CA
    });
    const adapter = new PrismaPg(pool);

    return new PrismaClient({
        adapter,
        log:
            process.env.NODE_ENV === "development"
                ? ["error", "warn"]
                : ["error"],
        transactionOptions: {
            maxWait: 15000,
            timeout: 15000,
        },
    });
};

declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
