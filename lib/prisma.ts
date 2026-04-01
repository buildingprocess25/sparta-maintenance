import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ quiet: true });

const prismaClientSingleton = () => {
    // Use DATABASE_URL (Supabase transaction pooler) for runtime.
    // DIRECT_URL is for migrations only (bypasses pooler, hits DB directly).
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error("DATABASE_URL environment variable is not set");
    }

    // Serverless-optimized pool: each function instance only handles
    // one request at a time, so max: 1 is sufficient.
    const pool = new Pool({
        connectionString: databaseUrl,
        max: 1,
        idleTimeoutMillis: 10000, // Release idle connections after 10s
        connectionTimeoutMillis: 10000,
        allowExitOnIdle: true,
    });
    const adapter = new PrismaPg(pool);

    return new PrismaClient({
        adapter,
        log:
            process.env.NODE_ENV === "development"
                ? ["error", "warn"]
                : ["error"],
    });
};

declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
