declare module "pg" {
    export type PoolConfig = {
        connectionString?: string;
        max?: number;
        idleTimeoutMillis?: number;
        connectionTimeoutMillis?: number;
        allowExitOnIdle?: boolean;
        options?: string;
        ssl?: boolean | { rejectUnauthorized?: boolean };
    };

    export class Pool {
        constructor(config?: PoolConfig);
        end(): Promise<void>;
    }
}
