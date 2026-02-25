import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import prisma from '../src/lib/prisma';


async function main() {
    console.log("Looking up first valid Google Integration...");
    const integration = await prisma.integration.findFirst({
        where: { provider: 'google' }
    });

    if (!integration) {
        console.error("No Google integration found in database.");
        process.exit(1);
    }

    if (!integration.accountId) {
        console.error("No accountId (GA Property) selected for this integration!");
        process.exit(1);
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`
    );

    oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
    });

    const analyticsDataClient = new BetaAnalyticsDataClient({ authClient: oauth2Client });

    console.log(`Querying runReport for property properties/${integration.accountId}...`);
    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${integration.accountId}`,
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            dimensions: [{ name: 'date' }],
            metrics: [{ name: 'activeUsers' }],
            orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
        });

        console.log(`Found ${response.rows?.length || 0} rows of data.`);
        let total = 0;
        response.rows?.forEach(row => {
            const date = row.dimensionValues?.[0]?.value;
            const visitors = parseInt(row.metricValues?.[0]?.value || '0', 10);
            total += visitors;
        });

        console.log(`Total 30-day visitors: ${total}`);
    } catch (e: any) {
        console.error("\nAPI ERROR:", e.message);
    }
}
main().finally(() => prisma.$disconnect());
