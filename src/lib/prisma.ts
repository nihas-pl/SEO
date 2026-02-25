import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

let prismaInstance: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
    if (prismaInstance) return prismaInstance;

    try {
        const directUrl = process.env.DIRECT_DATABASE_URL;
        const dbUrl = process.env.DATABASE_URL;

        if (!directUrl && !dbUrl) {
            console.warn('[PRISMA] No DATABASE_URL or DIRECT_DATABASE_URL set.');
        }

        if (directUrl) {
            // Direct TCP connection via pg driver adapter (required for Prisma v7 client engine)
            const pool = new pg.Pool({ connectionString: directUrl });
            const adapter = new PrismaPg(pool);
            prismaInstance = new PrismaClient({ adapter });
        } else if (dbUrl?.startsWith('prisma+postgres://')) {
            // Prisma Accelerate / Prisma Postgres HTTP connection
            prismaInstance = new PrismaClient({ accelerateUrl: dbUrl });
        } else if (dbUrl) {
            // Plain postgres:// URL via adapter
            const pool = new pg.Pool({ connectionString: dbUrl });
            const adapter = new PrismaPg(pool);
            prismaInstance = new PrismaClient({ adapter });
        } else {
            prismaInstance = new PrismaClient();
        }
    } catch (e) {
        console.error('[PRISMA] Failed to create PrismaClient:', e);
        prismaInstance = new PrismaClient();
    }

    return prismaInstance;
}

// Lazy-init proxy to prevent module-level crashes
const prisma = new Proxy({} as PrismaClient, {
    get(_target, prop) {
        const client = getPrismaClient();
        return (client as any)[prop];
    }
});

export default prisma;
