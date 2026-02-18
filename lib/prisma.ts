import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const prismaClientSingleton = () => {
    // Get database URL from environment
    const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error(
            "DATABASE_URL or DIRECT_URL environment variable is not set",
        );
    }

    // Create PostgreSQL adapter for Supabase with optimized connection pool
    const pool = new Pool({
        connectionString: databaseUrl,
        max: 20, // Maximum pool size
        idleTimeoutMillis: 30000, // Close idle connections after 30s
        connectionTimeoutMillis: 10000, // Timeout for acquiring connection
        allowExitOnIdle: true, // Allow process to exit when all connections idle
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
