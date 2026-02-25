export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { AnalyticsAdminServiceClient } from '@google-analytics/admin';
import { getAuthenticatedUser, AuthError } from '@/server/services/user-workspace';
import prisma from '@/lib/prisma';
import { google } from 'googleapis';

export async function GET(request: Request) {
    try {
        const { workspace } = await getAuthenticatedUser(request);

        const integration = await prisma.integration.findUnique({
            where: {
                workspaceId_provider: {
                    workspaceId: workspace.id,
                    provider: 'google',
                }
            }
        });

        if (!integration) {
            return NextResponse.json({ error: 'Google Account not connected' }, { status: 400 });
        }

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

        // Initialize the Admin API Client
        const analyticsAdminClient = new AnalyticsAdminServiceClient({
            authClient: oauth2Client,
        });

        // The Admin API returns a flat list of Properties the user has access to
        const properties: { id: string; name: string; accountName: string }[] = [];

        try {
            console.log('[GA4 API] Fetching account summaries from Admin API...');
            // Fetch account summaries which contain nested property information
            const [accountSummaries] = await analyticsAdminClient.listAccountSummaries({
                pageSize: 200, // Make sure we grab as many as possible
            });

            console.log(`[GA4 API] Admin API returned ${accountSummaries?.length || 0} account(s)`);

            if (accountSummaries) {
                for (const accountSummary of accountSummaries) {
                    const accountName = accountSummary.displayName || 'Unknown Account';
                    console.log(`[GA4 API] Processing Account: ${accountName}`);

                    if (accountSummary.propertySummaries && accountSummary.propertySummaries.length > 0) {
                        for (const property of accountSummary.propertySummaries) {
                            console.log(`[GA4 API]   Found Property: ${property.displayName} (${property.property})`);
                            // Extract just the numeric ID from "properties/1234567"
                            const propertyId = property.property?.replace('properties/', '') || '';
                            const propertyName = property.displayName || 'Unknown Property';

                            if (propertyId) {
                                properties.push({
                                    id: propertyId,
                                    name: propertyName,
                                    accountName: accountName
                                });
                            }
                        }
                    } else {
                        console.log(`[GA4 API]   No properties found in this account.`);
                    }
                }
            }
        } catch (apiError: any) {
            console.error('[GA4 API] Admin API check failed:', apiError);
            if (apiError.message?.includes('Permission denied')) {
                return NextResponse.json({
                    error: 'Missing required Analytics reading permissions. Need to re-authenticate.',
                    needsReauth: true
                }, { status: 403 });
            }
            throw apiError;
        }

        console.log(`[GA4 API] Total properties pushed to frontend: ${properties.length}`);
        return NextResponse.json({ properties });

    } catch (error: any) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error('[GA4 API] Failed to fetch properties:', error?.message || error);

        if (error?.message?.includes('invalid_grant')) {
            return NextResponse.json({ error: 'expired' }, { status: 401 });
        }

        return NextResponse.json(
            { error: 'Failed to retrieve GA4 properties' },
            { status: 500 }
        );
    }
}
