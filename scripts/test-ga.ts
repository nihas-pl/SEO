import { google } from 'googleapis';
import { AnalyticsAdminServiceClient } from '@google-analytics/admin';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import prisma from '../src/lib/prisma'; // Assumes tsx paths are setup, or we'll just use PrismaClient

async function main() {
    console.log("Looking up first valid Google Integration...");
    const integration = await prisma.integration.findFirst({
        where: { provider: 'google' }
    });

    if (!integration) {
        console.error("No Google integration found in database.");
        process.exit(1);
    }

    console.log(`Found auth token for Workspace: ${integration.workspaceId}`);

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`
    );

    oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
        expiry_date: integration.expiresAt ? integration.expiresAt.getTime() : null,
    });

    const adminClient = new AnalyticsAdminServiceClient({
        authClient: oauth2Client,
    });

    console.log("Calling listAccountSummaries()...");
    try {
        const [accountSummaries] = await adminClient.listAccountSummaries({ pageSize: 200 });

        if (!accountSummaries || accountSummaries.length === 0) {
            console.log("SUCCESS, but no account summaries returned.");
            return;
        }

        console.log(`Found ${accountSummaries.length} Accounts.`);
        for (const account of accountSummaries) {
            console.log(`\nAccount: ${account.displayName}`);
            if (account.propertySummaries && account.propertySummaries.length > 0) {
                for (const prop of account.propertySummaries) {
                    console.log(`  - Property: ${prop.displayName} (${prop.property})`);
                }
            } else {
                console.log(`  - (No properties)`);
            }
        }
    } catch (e: any) {
        console.error("\nAPI ERROR:", e.message);
    }
}
main().finally(() => prisma.$disconnect());
