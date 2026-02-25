/**
 * Script to debug the Google Analytics Admin API property fetching
 */
const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const { AnalyticsAdminServiceClient } = require('@google-analytics/admin');
const prisma = new PrismaClient();

async function main() {
    console.log("Looking up first valid Google Integration...");
    const integration = await prisma.integration.findFirst({
        where: { provider: 'google' }
    });

    if (!integration) {
        console.error("No Google integration found in database.");
        process.exit(1);
    }

    console.log(`Found integration Auth Token for Workspace: ${integration.workspaceId}`);

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

    // Auto-refresh token if needed
    try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        console.log("Token refreshed successfully.");
        oauth2Client.setCredentials(credentials);
    } catch (e) {
        console.log("Token refresh failed or not needed:", e.message);
    }

    console.log("Initializing Admin API Client...");
    const adminClient = new AnalyticsAdminServiceClient({
        authClient: oauth2Client,
    });

    console.log("Calling listAccountSummaries()...");
    try {
        const [accountSummaries] = await adminClient.listAccountSummaries();

        if (!accountSummaries || accountSummaries.length === 0) {
            console.log("SUCCESS, but no account summaries returned. This Google Account might not have any GA4 properties.");
            return;
        }

        console.log(`Found ${accountSummaries.length} Accounts.`);

        let foundProperties = 0;
        for (const account of accountSummaries) {
            console.log(`\nAccount: ${account.displayName} (${account.account})`);
            if (account.propertySummaries && account.propertySummaries.length > 0) {
                for (const prop of account.propertySummaries) {
                    console.log(`  - Property: ${prop.displayName} (${prop.property})`);
                    foundProperties++;
                }
            } else {
                console.log(`  - (No properties in this account)`);
            }
        }

        console.log(`\nTotal Properties Found: ${foundProperties}`);

    } catch (e) {
        console.error("\nAPI ERROR:", e);
    }
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
