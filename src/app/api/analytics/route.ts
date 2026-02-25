export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { getAuthenticatedUser, AuthError } from '@/server/services/user-workspace';
import prisma from '@/lib/prisma';
import { google } from 'googleapis';

export async function GET(request: Request) {
    try {
        // 1. Ensure user is authenticated
        const { workspace } = await getAuthenticatedUser(request);

        // 2. Look up the Google integration in the database for this workspace
        const integration = await prisma.integration.findUnique({
            where: {
                workspaceId_provider: {
                    workspaceId: workspace.id,
                    provider: 'google',
                }
            }
        });

        if (!integration) {
            return NextResponse.json({
                totalVisitors: 0,
                dailyVisitors: [],
                isConfigured: false,
            });
        }

        // Initialize OAuth2 client to potentially refresh the token
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

        // Event listener to save the refreshed token automatically to the DB if the SDK refreshed it
        oauth2Client.on('tokens', async (tokens) => {
            if (tokens.access_token) {
                await prisma.integration.update({
                    where: { id: integration.id },
                    data: {
                        accessToken: tokens.access_token,
                        refreshToken: tokens.refresh_token || undefined,
                        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
                    }
                });
                console.log(`[ANALYTICS API] Auto-refreshed access token for Workspace ${workspace.id}`);
            }
        });

        // Ensure we fetch a fresh token if it will expire soon
        const tokenResponse = await oauth2Client.getAccessToken();
        const token = tokenResponse.token;

        // If no GA Property ID is set in the DB, we have a connected account but no selected property.
        // For simplicity now, we assume the user provides it, or we rely on a global one if testing.
        const propertyId = integration.accountId || process.env.GA_PROPERTY_ID;

        if (!propertyId) {
            console.warn('[ANALYTICS API] Google Account connected but no GA_PROPERTY_ID selected or found.');
            return NextResponse.json({
                totalVisitors: 0,
                dailyVisitors: [],
                isConfigured: true,
                missingPropertyId: true,
            });
        }

        // 3. Initialize the GA4 Client with the user's OAuth access token
        const analyticsDataClient = new BetaAnalyticsDataClient({
            authClient: oauth2Client
        });

        // 4. Request the last 30 days of active users grouped by date
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [
                {
                    startDate: '30daysAgo',
                    endDate: 'today',
                },
            ],
            dimensions: [
                {
                    name: 'date',
                },
            ],
            metrics: [
                {
                    name: 'activeUsers',
                },
            ],
            orderBys: [
                {
                    dimension: {
                        dimensionName: 'date',
                    },
                    desc: false, // Chronological order
                },
            ],
        });

        let totalVisitors = 0;
        const dailyVisitors: { date: string; visitors: number }[] = [];

        // 5. Parse the GA4 response
        if (response.rows) {
            response.rows.forEach((row: any) => {
                const dateRaw = row.dimensionValues?.[0]?.value || '';
                // Format YYYYMMDD to YYYY-MM-DD
                const formattedDate = dateRaw
                    ? `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`
                    : 'Unknown';

                const visitors = parseInt(row.metricValues?.[0]?.value || '0', 10);

                totalVisitors += visitors;
                dailyVisitors.push({ date: formattedDate, visitors });
            });
        }

        return NextResponse.json({
            totalVisitors,
            dailyVisitors,
            isConfigured: true,
            missingPropertyId: false
        });

    } catch (error: any) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error('[ANALYTICS API] Failed to fetch GA4 data via OAuth:', error?.message || error);

        // Check for invalid grant (revoked tokens)
        if (error?.message?.includes('invalid_grant')) {
            return NextResponse.json({ error: 'Google Analytics connection expired or revoked. Please reconnect.' }, { status: 401 });
        }

        return NextResponse.json(
            { error: 'Failed to retrieve analytics data' },
            { status: 500 }
        );
    }
}
